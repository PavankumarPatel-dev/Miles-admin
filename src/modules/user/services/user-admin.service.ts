import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { FilterOperator, paginate } from 'nestjs-paginate/lib/paginate';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  REDIS_DASHBOARD_VERSION_KEYS,
} from '../../../common/redis/redis.provider';
import { BookingsService } from '../../bookings/services/bookings.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import {
  ActivityEntityType,
  ActivityLog,
} from '../entities/activity-log.entity';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';

@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ActivityLog)
    private readonly activityLogs: Repository<ActivityLog>,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookingsService: BookingsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async existsById(id: string) {
    return this.users.exists({ where: { id } });
  }

  async activeAdminProfile(id: string) {
    const user = await this.users.findOne({
      where: { id, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });
    if (!user) throw new UnauthorizedException('Admin user is unavailable');
    return user;
  }

  async dashboardStats(start: Date, end: Date) {
    const [total, active, newThisMonth, previousTotal] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { status: UserStatus.ACTIVE } }),
      this.users
        .createQueryBuilder('user')
        .where('user.createdAt >= :monthStart', { monthStart: start })
        .andWhere('user.createdAt < :now', { now: end })
        .getCount(),
      this.users
        .createQueryBuilder('user')
        .where('user.createdAt < :monthStart', { monthStart: start })
        .getCount(),
    ]);

    return { total, active, newThisMonth, previousTotal };
  }

  listActivity(entityType: ActivityEntityType, entityId: string) {
    return this.activityLogs.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  recordActivity(
    input: Pick<
      ActivityLog,
      | 'entityType'
      | 'entityId'
      | 'userId'
      | 'type'
      | 'title'
      | 'notes'
      | 'visible'
    >,
  ) {
    return this.activityLogs.save(this.activityLogs.create(input));
  }

  listSystemActivity(take: number) {
    return this.activityLogs.find({
      where: { visible: true, entityType: ActivityEntityType.SYSTEM },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  list(query: PaginateQuery) {
    return paginate(query, this.users, {
      sortableColumns: ['id', 'name', 'email', 'joiningDate'],
      searchableColumns: ['name', 'email'],
      filterableColumns: {
        role: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
      },
      defaultSortBy: [['joiningDate', 'DESC']],
      defaultLimit: 10,
      maxLimit: 100,
    });
  }

  async detail(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const [transactions, bookings, activity] = await Promise.all([
      this.transactionsService.listForUser(id, 5),
      this.bookingsService.listForUser(id, 5),
      this.activityLogs.find({
        where: { userId: id, visible: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);
    return {
      ...user,
      recentTransactions: transactions,
      recentBookings: bookings,
      activity,
    };
  }

  async create(input: CreateUserDto) {
    const email = input.email.toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('Email is already in use');
    }
    const { password, ...profile } = input;
    const user = this.users.create({
      ...profile,
      email,
      passwordHash: await hash(password, 12),
      role: input.role ?? UserRole.VIEWER,
      status: input.status ?? UserStatus.ACTIVE,
      avatarUrl: input.avatarUrl ?? null,
      phoneNumber: input.phoneNumber ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      address: input.address ?? null,
    });
    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(User).save(user);
      await manager.getRepository(ActivityLog).save(
        manager.getRepository(ActivityLog).create({
          entityType: ActivityEntityType.USER,
          entityId: created.id,
          userId: created.id,
          type: 'user.created',
          title: 'User created',
          notes: 'Created by an administrator',
          visible: true,
        }),
      );
      return created;
    });
    await this.redis.incr(REDIS_DASHBOARD_VERSION_KEYS.users).catch((error) => {
      this.logger.error(
        'Failed to update users dashboard cache version',
        error,
      );
    });
    return this.users.findOne({ where: { id: saved.id } });
  }

  async authenticateAdmin(email: string, password: string) {
    const user = await this.users.findOne({
      where: {
        email: email.toLowerCase(),
        role: UserRole.ADMIN,
      },
    });

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !password ||
      !user.passwordHash ||
      !(await compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const lastActiveAt = new Date();
    await this.users.update(user.id, { lastActiveAt });
    user.lastActiveAt = lastActiveAt;
    return user;
  }

  async update(id: string, input: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const email = input.email?.toLowerCase();
    if (email && email !== user.email.toLowerCase()) {
      if (await this.users.exists({ where: { email } })) {
        throw new ConflictException('Email is already in use');
      }
    }
    const changedFields = Object.keys(input);
    if (changedFields.length === 0) return user;
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update(id, { ...input, ...(email ? { email } : {}) });
      await manager.getRepository(ActivityLog).save(
        manager.getRepository(ActivityLog).create({
          entityType: ActivityEntityType.USER,
          entityId: id,
          userId: id,
          type: 'user.updated',
          title: 'User profile updated',
          notes: `Updated fields: ${changedFields.join(', ')}`,
          visible: true,
        }),
      );
    });
    await this.redis.incr(REDIS_DASHBOARD_VERSION_KEYS.users).catch((error) => {
      this.logger.error(
        'Failed to update users dashboard cache version',
        error,
      );
    });
    return this.users.findOne({ where: { id } });
  }

  async remove(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).softDelete(id);
      await manager.getRepository(ActivityLog).save(
        manager.getRepository(ActivityLog).create({
          entityType: ActivityEntityType.USER,
          entityId: id,
          userId: id,
          type: 'user.deleted',
          title: 'User deleted',
          notes: null,
          visible: true,
        }),
      );
    });
    await this.redis.incr(REDIS_DASHBOARD_VERSION_KEYS.users).catch((error) => {
      this.logger.error(
        'Failed to update users dashboard cache version',
        error,
      );
    });
    return { id, deleted: true };
  }
}
