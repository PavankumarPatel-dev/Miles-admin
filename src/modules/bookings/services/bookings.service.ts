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
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { FilterOperator, paginate } from 'nestjs-paginate/lib/paginate';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { UserAdminService } from '../../user/services/user-admin.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { ActivityEntityType } from '../../user/entities/activity-log.entity';
import {
  REDIS_CLIENT,
  REDIS_DASHBOARD_VERSION_KEYS,
} from '../../../common/redis/redis.provider';
import { Booking } from '../entities/booking.entity';
import { CreateBookingDto } from '../dto/request/create-booking.dto';
import { UpdateBookingDto } from '../dto/request/update-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @Inject(forwardRef(() => UserAdminService))
    private readonly userAdminService: UserAdminService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  list(query: PaginateQuery) {
    return paginate(query, this.bookings, {
      sortableColumns: ['id', 'bookingId', 'service', 'startAt'],
      searchableColumns: ['bookingId', 'service', 'user.name'],
      relations: { user: true },
      filterableColumns: {
        status: [FilterOperator.EQ],
        startAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
      defaultSortBy: [['startAt', 'DESC']],
      defaultLimit: 20,
      maxLimit: 100,
    });
  }

  async detail(key: string) {
    const booking = await this.findByKey(key);
    const [events, transactions] = await Promise.all([
      this.userAdminService.listActivity(
        ActivityEntityType.BOOKING,
        booking.id,
      ),
      this.transactionsService.listForBooking(booking.id),
    ]);
    return {
      ...booking,
      events,
      transactions,
    };
  }

  async create(input: CreateBookingDto) {
    const startAt = new Date(input.startAt);
    const endAt = this.calculateEndAt(startAt, input.duration);
    if (!(await this.userAdminService.existsById(input.userId))) {
      throw new NotFoundException('User not found');
    }
    const booking = await this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(Booking);
      const created = await bookingRepository.save(
        bookingRepository.create({
          userId: input.userId,
          service: input.service,
          startAt,
          endAt,
          amount: input.amount,
          currency: input.currency ?? 'INR',
          meetingType: input.meetingType ?? 'in_person',
          meetingLocation: input.meetingLocation ?? null,
          meetingUrl: input.meetingUrl ?? null,
          notes: input.notes ?? null,
          cancelledAt:
            input.status === BookingStatus.CANCELLED ? new Date() : null,
          status: input.status ?? BookingStatus.PENDING,
        }),
      );
      return created;
    });
    await this.redis
      .incr(REDIS_DASHBOARD_VERSION_KEYS.bookings)
      .catch((error) => {
        this.logger.error(
          'Failed to update bookings dashboard cache version',
          error,
        );
      });
    await this.userAdminService.recordActivity({
      entityType: ActivityEntityType.BOOKING,
      entityId: booking.id,
      userId: booking.userId,
      type: 'booking.created',
      title: 'Booking Created',
      notes: 'Meeting scheduled',
      visible: true,
    });
    return booking;
  }

  async update(key: string, input: UpdateBookingDto) {
    const booking = await this.findByKey(key);
    if (Object.keys(input).length === 0) return booking;

    const nextStatus = input.status ?? booking.status;
    const statusChanged = nextStatus !== booking.status;
    const scheduleChanged =
      input.startAt !== undefined || input.duration !== undefined;

    if (scheduleChanged) {
      if (input.startAt === undefined || input.duration === undefined) {
        throw new BadRequestException(
          'startAt and duration are required to reschedule a booking',
        );
      }
    }

    const previousStatus = booking.status;
    const { startAt, duration } = input;
    const updates: Partial<Booking> = {
      ...(statusChanged ? { status: nextStatus } : {}),
      ...(scheduleChanged
        ? {
            startAt: new Date(startAt!),
            endAt: this.calculateEndAt(new Date(startAt!), duration!),
          }
        : {}),
    };
    if (statusChanged && nextStatus === BookingStatus.CANCELLED) {
      updates.cancelledAt = new Date();
    }

    const { saved, activityEntries } = await this.dataSource.transaction(
      async (manager) => {
        const bookingRepository = manager.getRepository(Booking);
        await bookingRepository.update(booking.id, updates);
        const activityEntries: {
          type: string;
          title: string;
          notes: string | null;
        }[] = [];
        if (statusChanged) {
          activityEntries.push({
            type: `booking.${nextStatus}`,
            title: `Booking ${nextStatus}`,
            notes: `Status changed from ${previousStatus} to ${nextStatus}`,
          });
        }
        if (scheduleChanged) {
          activityEntries.push({
            type: 'booking.rescheduled',
            title: 'Meeting rescheduled',
            notes: null,
          });
        }
        if (!statusChanged && !scheduleChanged) {
          activityEntries.push({
            type: 'booking.updated',
            title: 'Booking updated',
            notes: `Updated fields: ${Object.keys(input).join(', ')}`,
          });
        }

        const updated = await bookingRepository.findOne({
          where: { id: booking.id },
          relations: { user: true },
        });
        if (!updated) throw new NotFoundException('Booking not found');
        return { saved: updated, activityEntries };
      },
    );
    await this.redis
      .incr(REDIS_DASHBOARD_VERSION_KEYS.bookings)
      .catch((error) => {
        this.logger.error(
          'Failed to update bookings dashboard cache version',
          error,
        );
      });
    await Promise.all(
      activityEntries.map((activity) =>
        this.userAdminService.recordActivity({
          entityType: ActivityEntityType.BOOKING,
          entityId: booking.id,
          userId: booking.userId,
          ...activity,
          visible: true,
        }),
      ),
    );
    return saved;
  }

  private async findByKey(key: string) {
    const booking = await this.bookings.findOne({
      where: [{ id: key }, { bookingId: key }],
      relations: { user: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async assertBookingOwner(bookingId: string, userId: string) {
    const booking = await this.bookings.findOneBy({ id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      throw new BadRequestException(
        'Booking does not belong to the selected user',
      );
    }
    return booking;
  }

  listForUser(userId: string, take: number) {
    return this.bookings.find({
      where: { userId },
      order: { startAt: 'DESC' },
      take,
    });
  }

  dashboardStats(period: {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  }) {
    return this.bookings
      .createQueryBuilder('booking')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status IN (:...activeStatuses))',
        'active',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :completedStatus)',
        'completed',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :cancelledStatus)',
        'cancelled',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.createdAt >= :monthStart AND booking.createdAt < :now)',
        'createdThisMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.createdAt >= :previousMonthStart AND booking.createdAt < :previousMonthEnd)',
        'createdPreviousMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status IN (:...activeStatuses) AND booking.createdAt >= :monthStart AND booking.createdAt < :now)',
        'activeThisMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status IN (:...activeStatuses) AND booking.createdAt >= :previousMonthStart AND booking.createdAt < :previousMonthEnd)',
        'activePreviousMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :completedStatus AND booking.createdAt >= :monthStart AND booking.createdAt < :now)',
        'completedThisMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :completedStatus AND booking.createdAt >= :previousMonthStart AND booking.createdAt < :previousMonthEnd)',
        'completedPreviousMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :cancelledStatus AND booking.createdAt >= :monthStart AND booking.createdAt < :now)',
        'cancelledThisMonth',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE booking.status = :cancelledStatus AND booking.createdAt >= :previousMonthStart AND booking.createdAt < :previousMonthEnd)',
        'cancelledPreviousMonth',
      )
      .setParameters({
        activeStatuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        completedStatus: BookingStatus.COMPLETED,
        cancelledStatus: BookingStatus.CANCELLED,
        monthStart: period.start,
        now: period.end,
        previousMonthStart: period.previousStart,
        previousMonthEnd: period.previousEnd,
      })
      .getRawOne<Record<string, string>>();
  }

  private assertSchedule(startAt: string, endAt: string) {
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      throw new BadRequestException('endAt must be later than startAt');
    }
  }

  private calculateEndAt(startAt: Date, durationHours: number) {
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new BadRequestException('duration must be greater than zero hours');
    }

    const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
    this.assertSchedule(startAt.toISOString(), endAt.toISOString());
    return endAt;
  }
}
