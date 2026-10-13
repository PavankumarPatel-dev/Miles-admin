import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Not, Repository } from 'typeorm';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import {
  REDIS_CLIENT,
  REDIS_DASHBOARD_VERSION_KEYS,
} from '../../../common/redis/redis.provider';
import { User } from '../../user/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { ChartQueryDto } from '../dto/chart-query.dto';
import { StatsQueryDto } from '../dto/stats-query.dto';
import {
  ActivityEntityType,
  ActivityLog,
} from '../../user/entities/activity-log.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(ActivityLog)
    private readonly activityLogs: Repository<ActivityLog>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async stats(query: StatsQueryDto = { section: 'dashboard' }) {
    const [users, bookings, transactions] = await Promise.all([
      this.cachedDashboardPart('users', 'stats', async () => {
        const now = new Date();
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        );
        const previousMonthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
        );
        const [total, active, newThisMonth, previousMonth] = await Promise.all([
          this.users.count(),
          this.users.count({ where: { status: UserStatus.ACTIVE } }),
          this.users
            .createQueryBuilder('user')
            .where('user.createdAt >= :monthStart', { monthStart })
            .getCount(),
          this.users
            .createQueryBuilder('user')
            .where(
              'user.createdAt >= :previousMonthStart AND user.createdAt < :monthStart',
              { previousMonthStart, monthStart },
            )
            .getCount(),
        ]);
        return {
          total,
          active,
          newThisMonth,
          changePercent: this.percentChange(newThisMonth, previousMonth),
        };
      }),
      this.cachedDashboardPart('bookings', 'stats', async () => {
        const [active, completed, cancelled] = await Promise.all([
          this.bookings.count({
            where: [
              { status: BookingStatus.PENDING },
              { status: BookingStatus.CONFIRMED },
            ],
          }),
          this.bookings.count({ where: { status: BookingStatus.COMPLETED } }),
          this.bookings.count({ where: { status: BookingStatus.CANCELLED } }),
        ]);
        return { active, completed, cancelled };
      }),
      this.cachedDashboardPart('transactions', 'stats', async () => {
        const now = new Date();
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        );
        const [
          total,
          pending,
          revenueByCurrency,
          volumeByCurrency,
          averageByCurrency,
          successfulPayments,
          attemptedPayments,
        ] = await Promise.all([
          this.transactions.count({
            where: { status: Not(TransactionStatus.REFUNDED) },
          }),
          this.transactions.count({
            where: { status: TransactionStatus.PENDING },
          }),
          this.transactions
            .createQueryBuilder('transaction')
            .select('transaction.currency', 'currency')
            .addSelect('SUM(transaction.amount)', 'amount')
            .where('transaction.status IN (:...statuses)', {
              statuses: [TransactionStatus.COMPLETED],
            })
            .andWhere('transaction.createdAt >= :monthStart', { monthStart })
            .groupBy('transaction.currency')
            .getRawMany<{ currency: string; amount: string }>(),
          this.transactions
            .createQueryBuilder('transaction')
            .select('transaction.currency', 'currency')
            .addSelect('SUM(ABS(transaction.amount))', 'amount')
            .where('transaction.status != :status', {
              status: TransactionStatus.REFUNDED,
            })
            .groupBy('transaction.currency')
            .getRawMany<{ currency: string; amount: string }>(),
          this.transactions
            .createQueryBuilder('transaction')
            .select('transaction.currency', 'currency')
            .addSelect('AVG(ABS(transaction.amount))', 'amount')
            .where('transaction.status != :status', {
              status: TransactionStatus.REFUNDED,
            })
            .groupBy('transaction.currency')
            .getRawMany<{ currency: string; amount: string }>(),
          this.transactions.count({
            where: {
              type: TransactionType.PAYMENT,
              status: TransactionStatus.COMPLETED,
            },
          }),
          this.transactions.count({
            where: [
              {
                type: TransactionType.PAYMENT,
                status: TransactionStatus.COMPLETED,
              },
              {
                type: TransactionType.PAYMENT,
                status: TransactionStatus.FAILED,
              },
            ],
          }),
        ]);

        return {
          total,
          pending,
          successRatePercent: attemptedPayments
            ? Number(
                ((successfulPayments / attemptedPayments) * 100).toFixed(1),
              )
            : null,
          averageAmountByCurrency: averageByCurrency.map((row) => ({
            currency: row.currency,
            amount: Number(row.amount).toFixed(2),
          })),
          totalVolumeByCurrency: volumeByCurrency.map((row) => ({
            currency: row.currency,
            amount: Number(row.amount).toFixed(2),
          })),
          averageTransactionByCurrency: averageByCurrency.map((row) => ({
            currency: row.currency,
            amount: Number(row.amount).toFixed(2),
          })),
          revenueByCurrency: revenueByCurrency.map((row) => ({
            currency: row.currency,
            amount: Number(row.amount).toFixed(2),
          })),
        };
      }),
    ]);

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const result = {
      users,
      bookings,
      transactions: {
        total: transactions.total,
        pending: transactions.pending,
        successRatePercent: transactions.successRatePercent,
        averageAmountByCurrency: transactions.averageAmountByCurrency,
      },
      revenueByCurrency: transactions.revenueByCurrency,
      period: { start: monthStart.toISOString(), end: now.toISOString() },
    };
    if (query.section === 'users') {
      return { users: result.users, period: result.period };
    }
    if (query.section === 'transactions') {
      return {
        transactions: result.transactions,
        revenueByCurrency: result.revenueByCurrency,
        period: result.period,
      };
    }
    if (query.section === 'bookings') {
      return { bookings: result.bookings, period: result.period };
    }
    return result;
  }

  async charts(query: ChartQueryDto) {
    return this.cachedDashboardPart(
      'transactions',
      `charts:${query.range}`,
      async () => {
        const { startAt, bucket } = this.range(query.range);
        const rows = await this.transactions
          .createQueryBuilder('transaction')
          .select(`DATE_TRUNC('${bucket}', transaction.createdAt)`, 'period')
          .addSelect('transaction.currency', 'currency')
          .addSelect('SUM(transaction.amount)', 'amount')
          .where('transaction.status = :status', {
            status: TransactionStatus.COMPLETED,
          })
          .andWhere('transaction.createdAt >= :startAt', { startAt })
          .groupBy('period')
          .addGroupBy('transaction.currency')
          .orderBy('period', 'ASC')
          .getRawMany<{ period: Date; currency: string; amount: string }>();

        const seriesByCurrency = new Map<
          string,
          { period: string; label: string; revenue: string }[]
        >();
        for (const row of rows) {
          const series = seriesByCurrency.get(row.currency) ?? [];
          series.push({
            period: new Date(row.period).toISOString(),
            label: this.chartLabel(new Date(row.period), query.range, startAt),
            revenue: Number(row.amount).toFixed(2),
          });
          seriesByCurrency.set(row.currency, series);
        }
        return {
          range: query.range,
          startAt: startAt.toISOString(),
          series: [...seriesByCurrency].map(([currency, points]) => ({
            currency,
            points,
          })),
        };
      },
    );
  }

  async alerts() {
    const logs = await this.activityLogs.find({
      where: { visible: true, entityType: ActivityEntityType.SYSTEM },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return logs.map((log) => ({
      title: log.title,
      notes: log.notes,
      createdAt: log.createdAt,
    }));
  }

  private range(range: ChartQueryDto['range']) {
    const now = new Date();
    const startAt = new Date(now);
    const bucket: 'day' | 'week' | 'month' =
      range === '7d' ? 'day' : range === '1m' ? 'week' : 'month';
    if (range === '7d') startAt.setUTCDate(startAt.getUTCDate() - 6);
    if (range === '1m') startAt.setUTCMonth(startAt.getUTCMonth() - 1);
    if (range === '3m') startAt.setUTCMonth(startAt.getUTCMonth() - 3);
    if (range === '6m') startAt.setUTCMonth(startAt.getUTCMonth() - 6);
    if (range === '1y') startAt.setUTCFullYear(startAt.getUTCFullYear() - 1);
    return { startAt, bucket };
  }

  private chartLabel(
    period: Date,
    range: ChartQueryDto['range'],
    startAt: Date,
  ) {
    if (range === '7d') {
      return period.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      });
    }
    if (range === '1m') {
      const week =
        Math.floor(
          (period.getTime() - startAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
        ) + 1;
      return `W${Math.max(1, week)}`;
    }
    return period.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private async cachedDashboardPart<T>(
    domain: keyof typeof REDIS_DASHBOARD_VERSION_KEYS,
    suffix: string,
    calculate: () => Promise<T>,
  ): Promise<T> {
    let key: string | undefined;
    try {
      const version =
        (await this.redis.get(REDIS_DASHBOARD_VERSION_KEYS[domain])) ?? '0';
      key = `adminhub:redis:dashboard:${String(domain)}:${version}:${suffix}`;
      const storedValue = await this.redis.get(key);
      if (storedValue) return JSON.parse(storedValue) as T;
    } catch {
      return calculate();
    }

    const result = await calculate();
    if (key) {
      await this.redis
        .set(key, JSON.stringify(result), 'EX', 3_600)
        .catch(() => undefined);
    }
    return result;
  }
}
