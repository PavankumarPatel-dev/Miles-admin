import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  REDIS_DASHBOARD_VERSION_KEYS,
} from '../../../common/redis/redis.provider';
import { UserAdminService } from '../../user/services/user-admin.service';
import { BookingsService } from '../../bookings/services/bookings.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { ChartQueryDto } from '../dto/chart-query.dto';
import { StatsQueryDto } from '../dto/stats-query.dto';
import {
  ChartBucket,
  ChartRange,
  DashboardPeriod,
  getCurrentDashboardPeriod,
  getDashboardChartRange,
} from '../utils/dashboard-date.util';

type CurrencyAmount = {
  currency: string;
  amount: string;
};

type UserStats = {
  total: number;
  active: number;
  newThisMonth: number;
  changePercent: number | null;
};

type BookingStats = {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  totalChangePercent: number | null;
  activeChangePercent: number | null;
  completedChangePercent: number | null;
  cancelledChangePercent: number | null;
};

type TransactionStats = {
  total: number;
  pending: number;
  pendingChangePercent: number | null;
  successRatePercent: number | null;
  totalVolumeByCurrency: CurrencyAmount[];
  averageTransactionByCurrency: CurrencyAmount[];
  revenueByCurrency: (CurrencyAmount & { changePercent: number | null })[];
};

const DASHBOARD_CACHE_KEYS = {
  usersStats: 'dashboard:users:stats',
  bookingsStats: 'dashboard:bookings:stats',
  transactionsStats: 'dashboard:transactions:stats',
} as const;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly bookingsService: BookingsService,
    private readonly transactionsService: TransactionsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async stats(query: StatsQueryDto = { section: 'dashboard' }) {
    const period = getCurrentDashboardPeriod();
    const [users, bookings, transactions] = await Promise.all([
      this.cachedDashboardPart(
        DASHBOARD_CACHE_KEYS.usersStats,
        REDIS_DASHBOARD_VERSION_KEYS.users,
        () => this.getUserStats(period),
      ),
      this.cachedDashboardPart(
        DASHBOARD_CACHE_KEYS.bookingsStats,
        REDIS_DASHBOARD_VERSION_KEYS.bookings,
        () => this.getBookingStats(period),
      ),
      this.cachedDashboardPart(
        DASHBOARD_CACHE_KEYS.transactionsStats,
        REDIS_DASHBOARD_VERSION_KEYS.transactions,
        () => this.getTransactionStats(period),
      ),
    ]);

    return this.formatStatsResponse(query.section, {
      users,
      bookings,
      transactions,
      period,
    });
  }

  async charts(query: ChartQueryDto) {
    const cacheKey = `dashboard:transactions:chart:${query.range}`;
    return this.cachedDashboardPart(
      cacheKey,
      REDIS_DASHBOARD_VERSION_KEYS.transactions,
      async () => {
        const range = getDashboardChartRange(query.range);
        const rows = await this.getRevenueChartRows(range);
        return {
          range: query.range,
          startAt: range.startAt.toISOString(),
          endAt: range.endAt.toISOString(),
          bucket: range.bucket,
          series: this.buildChartSeries(rows, range),
        };
      },
    );
  }

  async alerts() {
    const logs = await this.userAdminService.listSystemActivity(5);
    return logs.map((log) => ({
      id: log.id,
      type: log.type,
      title: log.title,
      notes: log.notes,
      createdAt: log.createdAt,
    }));
  }

  private async getUserStats(period: DashboardPeriod): Promise<UserStats> {
    const { total, active, newThisMonth, previousTotal } =
      await this.userAdminService.dashboardStats(period.start, period.end);

    return {
      total,
      active,
      newThisMonth,
      changePercent: this.percentChange(total, previousTotal),
    };
  }

  private async getBookingStats(
    period: DashboardPeriod,
  ): Promise<BookingStats> {
    const row = await this.bookingsService.dashboardStats(period);

    const count = (name: string) => this.rawNumber(row, name);

    return {
      total: count('total'),
      active: count('active'),
      completed: count('completed'),
      cancelled: count('cancelled'),
      totalChangePercent: this.percentChange(
        count('createdThisMonth'),
        count('createdPreviousMonth'),
      ),
      activeChangePercent: this.percentChange(
        count('activeThisMonth'),
        count('activePreviousMonth'),
      ),
      completedChangePercent: this.percentChange(
        count('completedThisMonth'),
        count('completedPreviousMonth'),
      ),
      cancelledChangePercent: this.percentChange(
        count('cancelledThisMonth'),
        count('cancelledPreviousMonth'),
      ),
    };
  }

  private async getTransactionStats(
    period: DashboardPeriod,
  ): Promise<TransactionStats> {
    const [counts, amountRows, revenueRows] = await Promise.all([
      this.getTransactionCounts(period),
      this.getTransactionAmountRows(),
      this.getTransactionRevenueRows(period),
    ]);

    return {
      total: this.rawNumber(counts, 'total'),
      pending: this.rawNumber(counts, 'pending'),
      pendingChangePercent: this.percentChange(
        this.rawNumber(counts, 'pendingThisMonth'),
        this.rawNumber(counts, 'pendingPreviousMonth'),
      ),
      successRatePercent: this.successRate(counts),
      totalVolumeByCurrency: amountRows.map((row) => ({
        currency: row.currency,
        amount: Number(row.volume).toFixed(2),
      })),
      averageTransactionByCurrency: amountRows.map((row) => ({
        currency: row.currency,
        amount: Number(row.average).toFixed(2),
      })),
      revenueByCurrency: this.revenueByCurrency(amountRows, revenueRows),
    };
  }

  private getTransactionCounts(period: DashboardPeriod) {
    return this.transactionsService.dashboardCounts(period);
  }

  private getTransactionAmountRows() {
    return this.transactionsService.dashboardAmountRows();
  }

  private getTransactionRevenueRows(period: DashboardPeriod) {
    return this.transactionsService.dashboardRevenueRows(period);
  }

  private async getRevenueChartRows(range: ChartRange) {
    return this.transactionsService.dashboardRevenueChartRows(range);
  }

  private formatStatsResponse(
    section: StatsQueryDto['section'],
    data: {
      users: UserStats;
      bookings: BookingStats;
      transactions: TransactionStats;
      period: DashboardPeriod;
    },
  ) {
    const period = {
      start: data.period.start.toISOString(),
      end: data.period.end.toISOString(),
    };

    if (section === 'users') {
      return {
        totalUsers: data.users.total,
        activeUsers: data.users.active,
        newThisMonth: data.users.newThisMonth,
        period,
      };
    }

    if (section === 'transactions') {
      return {
        totalTransactions: data.transactions.total,
        totalVolume: data.transactions.totalVolumeByCurrency,
        averageTransaction: data.transactions.averageTransactionByCurrency,
        successRate: data.transactions.successRatePercent,
        period,
      };
    }

    if (section === 'bookings') {
      return {
        totalBookings: {
          value: data.bookings.total,
          changePercentage: data.bookings.totalChangePercent,
        },
        activeBookings: {
          value: data.bookings.active,
          changePercentage: data.bookings.activeChangePercent,
        },
        completedBookings: {
          value: data.bookings.completed,
          changePercentage: data.bookings.completedChangePercent,
        },
        cancelledBookings: {
          value: data.bookings.cancelled,
          changePercentage: data.bookings.cancelledChangePercent,
        },
        period,
      };
    }

    return {
      totalUsers: {
        value: data.users.total,
        changePercentage: data.users.changePercent,
      },
      totalRevenue: data.transactions.revenueByCurrency.map((item) => ({
        amount: item.amount,
        currency: item.currency,
        changePercentage: item.changePercent,
      })),
      activeBookings: {
        value: data.bookings.active,
        changePercentage: data.bookings.activeChangePercent,
      },
      pendingTransactions: {
        value: data.transactions.pending,
        changePercentage: data.transactions.pendingChangePercent,
      },
      period,
    };
  }

  private revenueByCurrency(
    amountRows: { currency: string }[],
    revenueRows: {
      currency: string;
      currentAmount: string | null;
      previousAmount: string | null;
    }[],
  ) {
    const currencies = new Set([
      ...amountRows.map((row) => row.currency),
      ...revenueRows.map((row) => row.currency),
    ]);

    if (currencies.size === 0) currencies.add('INR');

    return [...currencies].map((currency) => {
      const row = revenueRows.find((item) => item.currency === currency);
      const amount = Number(row?.currentAmount ?? 0);
      return {
        currency,
        amount: amount.toFixed(2),
        changePercent: this.percentChange(
          amount,
          Number(row?.previousAmount ?? 0),
        ),
      };
    });
  }

  private buildChartSeries(
    rows: { period: Date; currency: string; amount: string }[],
    range: ChartRange,
  ) {
    const amountsByCurrency = new Map<string, Map<string, number>>();

    for (const row of rows) {
      const period = new Date(row.period).toISOString();
      const amounts = amountsByCurrency.get(row.currency) ?? new Map();
      amounts.set(period, Number(row.amount));
      amountsByCurrency.set(row.currency, amounts);
    }

    return [...amountsByCurrency].map(([currency, amounts]) => ({
      currency,
      points: range.periods.map((period) => {
        const periodKey = period.toISOString();
        return {
          period: periodKey,
          label: this.chartLabel(period, range.bucket),
          revenue: (amounts.get(periodKey) ?? 0).toFixed(2),
        };
      }),
    }));
  }

  private chartLabel(period: Date, bucket: ChartBucket) {
    if (bucket === 'day') {
      return period.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }
    if (bucket === 'week') {
      return `Week of ${period.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })}`;
    }
    return period.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private successRate(row: Record<string, string> | undefined) {
    const attemptedPayments = this.rawNumber(row, 'attemptedPayments');
    if (attemptedPayments === 0) return null;

    return Number(
      (
        (this.rawNumber(row, 'successfulPayments') / attemptedPayments) *
        100
      ).toFixed(1),
    );
  }

  private rawNumber(row: Record<string, string> | undefined, name: string) {
    return Number(row?.[name] ?? 0);
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private async cachedDashboardPart<T>(
    cacheKey: string,
    versionKey: string,
    calculate: () => Promise<T>,
  ): Promise<T> {
    let version: string;
    try {
      version = (await this.redis.get(versionKey)) ?? '0';
    } catch (error) {
      this.logger.error(
        'Failed to read dashboard cache version from Redis',
        error instanceof Error ? error.stack : String(error),
      );
      return calculate();
    }

    const versionedCacheKey = `${cacheKey}:${version}`;
    let cachedValue: string | null;
    try {
      cachedValue = await this.redis.get(versionedCacheKey);
    } catch (error) {
      this.logger.error(
        'Failed to read dashboard cache from Redis',
        error instanceof Error ? error.stack : String(error),
      );
      cachedValue = null;
    }

    if (cachedValue !== null) {
      try {
        return JSON.parse(cachedValue) as T;
      } catch (error) {
        this.logger.error(
          'Failed to parse cached dashboard data',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const result = await calculate();
    try {
      await this.redis.set(
        versionedCacheKey,
        JSON.stringify(result),
        'EX',
        3_600,
      );
    } catch (error) {
      this.logger.error(
        'Failed to write dashboard cache to Redis',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return result;
  }
}
