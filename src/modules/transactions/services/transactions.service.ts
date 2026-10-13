import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Redis from 'ioredis';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { FilterOperator, paginate } from 'nestjs-paginate/lib/paginate';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { ActivityEntityType } from '../../user/entities/activity-log.entity';
import { UserAdminService } from '../../user/services/user-admin.service';
import { BookingsService } from '../../bookings/services/bookings.service';
import { CreateTransactionDto } from '../dto/request/create-transaction.dto';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { PaymentMethod } from '../entities/payment-method.entity';
import {
  REDIS_CLIENT,
  REDIS_DASHBOARD_VERSION_KEYS,
} from '../../../common/redis/redis.provider';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @Inject(forwardRef(() => UserAdminService))
    private readonly userAdminService: UserAdminService,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookingsService: BookingsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  list(query: PaginateQuery) {
    const filters = query.filter as Record<string, unknown> | undefined;
    const dateRange =
      (query as PaginateQuery & { date?: string; dateRange?: string }).date ??
      (query as PaginateQuery & { dateRange?: string }).dateRange;
    const amountStart = (query as PaginateQuery & { amountStart?: string })
      .amountStart;
    const amountEnd = (query as PaginateQuery & { amountEnd?: string })
      .amountEnd;
    const dateStart = this.dateRangeStart(dateRange);

    query.sortBy = [['createdAt', 'DESC']];
    query.search = query.search?.trim();
    query.filter = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(dateStart ? { createdAt: `$gte:${dateStart.toISOString()}` } : {}),
      ...(amountStart || amountEnd
        ? {
            amount: [
              ...(amountStart ? [`$gte:${amountStart}`] : []),
              ...(amountEnd ? [`$lte:${amountEnd}`] : []),
            ],
          }
        : {}),
    } as Record<string, string | string[]>;

    return paginate(query, this.transactions, {
      sortableColumns: ['createdAt'],
      searchableColumns: ['transactionId', 'user.name'],
      relations: { user: true },
      filterableColumns: {
        status: [FilterOperator.EQ],
        amount: [FilterOperator.GTE, FilterOperator.LTE],
        createdAt: [FilterOperator.GTE],
      },
      defaultSortBy: [['createdAt', 'DESC']],
      defaultLimit: 10,
      maxLimit: 100,
    });
  }

  async detail(key: string) {
    const transaction = await this.findByKey(key);
    const [events, relatedTransactions] = await Promise.all([
      this.userAdminService.listActivity(
        ActivityEntityType.TRANSACTION,
        transaction.id,
      ),
      this.transactions.find({
        where: { userId: transaction.userId },
        relations: { paymentMethod: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);
    return {
      ...transaction,
      events,
      relatedTransactions: relatedTransactions.filter(
        (entry) => entry.id !== transaction.id,
      ),
    };
  }

  async create(input: CreateTransactionDto) {
    const status = input.status ?? TransactionStatus.PENDING;
    if (!(await this.userAdminService.existsById(input.userId))) {
      throw new NotFoundException('User not found');
    }
    if (input.bookingId) {
      await this.bookingsService.assertBookingOwner(
        input.bookingId,
        input.userId,
      );
    }
    const transaction = await this.dataSource.transaction(async (manager) => {
      if (input.paymentMethodId) {
        const paymentMethod = await manager
          .getRepository(PaymentMethod)
          .findOneBy({ id: input.paymentMethodId });
        if (!paymentMethod) {
          throw new NotFoundException('Payment method not found');
        }
        if (paymentMethod.userId !== input.userId) {
          throw new BadRequestException(
            'Payment method does not belong to the selected user',
          );
        }
      }

      const transactionRepository = manager.getRepository(Transaction);
      const created = await transactionRepository.save(
        transactionRepository.create({
          ...input,
          amount: input.amount,
          platformFee: input.platformFee ?? '0.00',
          subtotal: input.subtotal ?? input.amount.replace(/^-/, ''),
          currency: input.currency?.toUpperCase() ?? 'INR',
          reference: input.reference ?? null,
          description: input.description ?? null,
          bookingId: input.bookingId ?? null,
          paymentMethodId: input.paymentMethodId ?? null,
          status,
          settledAt: status === TransactionStatus.COMPLETED ? new Date() : null,
        }),
      );
      return created;
    });
    await this.redis
      .incr(REDIS_DASHBOARD_VERSION_KEYS.transactions)
      .catch((error) => {
        this.logger.error(
          'Failed to update transactions dashboard cache version',
          error,
        );
      });
    await this.userAdminService.recordActivity({
      entityType: ActivityEntityType.TRANSACTION,
      entityId: transaction.id,
      userId: transaction.userId,
      type:
        status === TransactionStatus.PENDING
          ? 'transaction.created'
          : `transaction.${status}`,
      title:
        status === TransactionStatus.PENDING
          ? 'Transaction created'
          : `Transaction ${status}`,
      notes: `Payment type: ${transaction.type}`,
      visible: true,
    });
    return transaction;
  }

  async refund(key: string) {
    const transaction = await this.findByKey(key);
    if (transaction.status === TransactionStatus.REFUNDED) return transaction;
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Transaction).update(transaction.id, {
        status: TransactionStatus.REFUNDED,
        type: TransactionType.REFUND,
        settledAt: new Date(),
      });
    });
    await this.redis
      .incr(REDIS_DASHBOARD_VERSION_KEYS.transactions)
      .catch((error) => {
        this.logger.error(
          'Failed to update transactions dashboard cache version',
          error,
        );
      });
    await this.userAdminService.recordActivity({
      entityType: ActivityEntityType.TRANSACTION,
      entityId: transaction.id,
      userId: transaction.userId,
      type: `transaction.${TransactionStatus.REFUNDED}`,
      title: `Transaction ${TransactionStatus.REFUNDED}`,
      notes: null,
      visible: true,
    });
    return this.findByKey(transaction.id);
  }

  private async findByKey(key: string) {
    const transaction = await this.transactions.findOne({
      where: [{ id: key }, { transactionId: key }],
      relations: { user: true, booking: true, paymentMethod: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  listForBooking(bookingId: string) {
    return this.transactions.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  listForUser(userId: string, take: number) {
    return this.transactions.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  dashboardCounts(period: {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  }) {
    return this.transactions
      .createQueryBuilder('transaction')
      .select(
        'COUNT(*) FILTER (WHERE transaction.status != :refunded)',
        'total',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE transaction.status = :pending)',
        'pending',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE transaction.status = :pending AND transaction.createdAt >= :monthStart AND transaction.createdAt < :now)',
        'pendingThisMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE transaction.status = :pending AND transaction.createdAt >= :previousMonthStart AND transaction.createdAt < :previousMonthEnd)',
        'pendingPreviousMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE transaction.type = :payment AND transaction.status = :completed)',
        'successfulPayments',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE transaction.type = :payment AND transaction.status IN (:...attemptedStatuses))',
        'attemptedPayments',
      )
      .setParameters({
        refunded: TransactionStatus.REFUNDED,
        pending: TransactionStatus.PENDING,
        completed: TransactionStatus.COMPLETED,
        payment: TransactionType.PAYMENT,
        attemptedStatuses: [
          TransactionStatus.COMPLETED,
          TransactionStatus.FAILED,
        ],
        monthStart: period.start,
        now: period.end,
        previousMonthStart: period.previousStart,
        previousMonthEnd: period.previousEnd,
      })
      .getRawOne<Record<string, string>>();
  }

  dashboardAmountRows() {
    return this.transactions
      .createQueryBuilder('transaction')
      .select('transaction.currency', 'currency')
      .addSelect('SUM(ABS(transaction.amount))', 'volume')
      .addSelect('AVG(ABS(transaction.amount))', 'average')
      .where('transaction.status != :refunded', {
        refunded: TransactionStatus.REFUNDED,
      })
      .groupBy('transaction.currency')
      .getRawMany<{ currency: string; volume: string; average: string }>();
  }

  dashboardRevenueRows(period: {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  }) {
    return this.transactions
      .createQueryBuilder('transaction')
      .select('transaction.currency', 'currency')
      .addSelect(
        'SUM(transaction.amount) FILTER (WHERE transaction.createdAt >= :monthStart AND transaction.createdAt < :now)',
        'currentAmount',
      )
      .addSelect(
        'SUM(transaction.amount) FILTER (WHERE transaction.createdAt >= :previousMonthStart AND transaction.createdAt < :previousMonthEnd)',
        'previousAmount',
      )
      .where('transaction.status = :completed', {
        completed: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.type = :payment', {
        payment: TransactionType.PAYMENT,
      })
      .andWhere(
        'transaction.createdAt >= :previousMonthStart AND transaction.createdAt < :now',
        { previousMonthStart: period.previousStart, now: period.end },
      )
      .setParameters({
        monthStart: period.start,
        previousMonthEnd: period.previousEnd,
      })
      .groupBy('transaction.currency')
      .getRawMany<{
        currency: string;
        currentAmount: string | null;
        previousAmount: string | null;
      }>();
  }

  dashboardRevenueChartRows(range: {
    bucket: 'day' | 'week' | 'month';
    startAt: Date;
    endAt: Date;
  }) {
    return this.transactions
      .createQueryBuilder('transaction')
      .select(
        `DATE_TRUNC('${range.bucket}', transaction.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
        'period',
      )
      .addSelect('transaction.currency', 'currency')
      .addSelect('SUM(transaction.amount)', 'amount')
      .where('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.type = :payment', {
        payment: TransactionType.PAYMENT,
      })
      .andWhere(
        'transaction.createdAt >= :startAt AND transaction.createdAt < :endAt',
        { startAt: range.startAt, endAt: range.endAt },
      )
      .groupBy('period')
      .addGroupBy('transaction.currency')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: Date; currency: string; amount: string }>();
  }

  private dateRangeStart(value?: string) {
    if (!value) return undefined;
    const match = /^last(\d+)d$/i.exec(value);
    if (!match) {
      throw new BadRequestException(
        'date must use the format last30d, last60d, or another lastNd value',
      );
    }
    const days = Number(match[1]);
    if (!Number.isSafeInteger(days) || days <= 0) {
      throw new BadRequestException(
        'date range must contain a positive number of days',
      );
    }
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    return start;
  }
}
