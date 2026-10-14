import 'reflect-metadata';
import { hash } from 'bcrypt';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { AppDataSource } from './data-source';
import { Booking } from '../modules/bookings/entities/booking.entity';
import {
  ActivityEntityType,
  ActivityLog,
} from '../modules/user/entities/activity-log.entity';
import { User } from '../modules/user/entities/user.entity';
import { PaymentMethod } from '../modules/transactions/entities/payment-method.entity';
import { Transaction } from '../modules/transactions/entities/transaction.entity';

const firstNames = [
  'Avery',
  'Jordan',
  'Morgan',
  'Riley',
  'Taylor',
  'Casey',
  'Jamie',
  'Cameron',
  'Reese',
  'Quinn',
];
const lastNames = [
  'Bennett',
  'Hayes',
  'Parker',
  'Reed',
  'Brooks',
  'Sullivan',
  'Foster',
  'Coleman',
  'Bailey',
  'Morgan',
];
const services = [
  'Consultation',
  'Design Session',
  'Wellness Review',
  'Strategy Call',
  'Follow-up',
];
const day = 24 * 60 * 60 * 1000;

function startOfUtcWeek(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);
  const paymentRepository = AppDataSource.getRepository(PaymentMethod);
  const bookingRepository = AppDataSource.getRepository(Booking);
  const transactionRepository = AppDataSource.getRepository(Transaction);
  const activityRepository = AppDataSource.getRepository(ActivityLog);

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
    }
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });
    if (!existingAdmin) {
      await userRepository.save(
        userRepository.create({
          email: adminEmail.toLowerCase(),
          passwordHash: await hash(adminPassword, 12),
          name: process.env.ADMIN_NAME || 'AdminHub Administrator',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          avatarUrl: null,
          phoneNumber: null,
          dateOfBirth: null,
          address: null,
          isConfirmed: true,
          isTwoFactorEnabled: false,
        }),
      );
    }

    const userPasswordHash = await hash('User-LocalOnly123!', 10);
    const users: User[] = [];
    for (let index = 1; index <= 30; index += 1) {
      const email = `#user.${String(index).padStart(2, '0')}@example.com`;
      let user = await userRepository.findOne({ where: { email } });
      if (!user) {
        const firstName = firstNames[(index - 1) % firstNames.length];
        const lastName =
          lastNames[
            Math.floor((index - 1) / firstNames.length) % lastNames.length
          ];
        user = await userRepository.save(
          userRepository.create({
            email,
            passwordHash: userPasswordHash,
            name: `${firstName} ${lastName}`,
            avatarUrl: null,
            phoneNumber: `+1555${String(index).padStart(7, '0')}`,
            dateOfBirth: null,
            address: `${index} Example Street`,
            role: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER][index % 3],
            status:
              index % 9 === 0
                ? UserStatus.SUSPENDED
                : index % 7 === 0
                  ? UserStatus.INACTIVE
                  : UserStatus.ACTIVE,
            isConfirmed: index % 4 !== 0,
            isTwoFactorEnabled: index % 5 === 0,
            lastActiveAt: new Date(Date.now() - index * 3_600_000),
            createdAt: new Date(
              Date.now() - (index % 6 === 0 ? 10 : 100 + index) * day,
            ),
          }),
        );
      }
      users.push(user);
    }

    const methods = new Map<string, PaymentMethod>();
    for (const [index, user] of users.entries()) {
      if (index >= 12) continue;
      let method = await paymentRepository.findOne({
        where: { userId: user.id },
      });
      if (!method) {
        method = await paymentRepository.save(
          paymentRepository.create({
            userId: user.id,
            provider: 'stripe',
            providerMethodId: `pm_seed_${user.id}`,
            cardType: index % 2 === 0 ? 'Visa' : 'Mastercard',
            lastFourDigit: String(4100 + index).slice(-4),
          }),
        );
      }
      methods.set(user.id, method);
    }

    const bookings: Booking[] = [];
    for (let index = 1; index <= 50; index += 1) {
      const bookingId = `#BKG-${String(index).padStart(4, '0')}`;
      let booking = await bookingRepository.findOne({ where: { bookingId } });
      if (!booking) {
        const user = users[(index - 1) % users.length];
        const status = [
          BookingStatus.COMPLETED,
          BookingStatus.CONFIRMED,
          BookingStatus.PENDING,
          BookingStatus.CANCELLED,
        ][index % 4];
        const startAt = new Date(Date.now() + ((index % 15) - 5) * day);
        booking = await bookingRepository.save(
          bookingRepository.create({
            bookingId,
            userId: user.id,
            service: services[index % services.length],
            startAt,
            endAt: new Date(
              startAt.getTime() + (60 + (index % 3) * 30) * 60_000,
            ),
            status,
            amount: (950 + index * 35).toFixed(2),
            currency: 'INR',
            meetingType: index % 2 === 0 ? 'virtual' : 'in_person',
            meetingLocation:
              index % 2 === 0 ? 'Online meeting' : `${index} Market Road`,
            meetingUrl: null,
            notes: null,
            cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
            createdAt: new Date(Date.now() - index * 5 * day),
          }),
        );
        await activityRepository.save(
          activityRepository.create({
            entityType: ActivityEntityType.BOOKING,
            entityId: booking.id,
            userId: user.id,
            type: 'booking.created',
            title: 'Booking Created',
            notes: 'Created from the local demo seed',
            visible: true,
          }),
        );
      }
      bookings.push(booking);
    }

    for (let index = 1; index <= 50; index += 1) {
      const transactionId = `#TXN-${String(index).padStart(4, '0')}`;
      if (await transactionRepository.findOne({ where: { transactionId } }))
        continue;
      const booking = bookings[(index - 1) % bookings.length];
      const user = users[(index - 1) % users.length];
      const status = [
        TransactionStatus.COMPLETED,
        TransactionStatus.PENDING,
        TransactionStatus.FAILED,
        TransactionStatus.REFUNDED,
        TransactionStatus.CANCELLED,
      ][index % 5];
      const type =
        index % 9 === 0
          ? TransactionType.REFUND
          : index % 11 === 0
            ? TransactionType.TRANSFER
            : TransactionType.PAYMENT;
      const amount = 420 + index * 178.25;
      const transaction = await transactionRepository.save(
        transactionRepository.create({
          transactionId,
          bookingId: booking.id,
          userId: user.id,
          paymentMethodId: methods.get(user.id)?.id ?? null,
          type,
          status,
          amount: amount.toFixed(2),
          currency: 'INR',
          reference: `demo_ref_${String(index).padStart(5, '0')}`,
          description: booking.service,
          platformFee: (amount * 0.025).toFixed(2),
          subtotal: amount.toFixed(2),
          settledAt:
            status === TransactionStatus.COMPLETED ||
            status === TransactionStatus.REFUNDED
              ? new Date(Date.now() - index * 7 * day)
              : null,
          createdAt: new Date(Date.now() - index * 7 * day),
        }),
      );
      await activityRepository.save(
        activityRepository.create({
          entityType: ActivityEntityType.TRANSACTION,
          entityId: transaction.id,
          userId: user.id,
          type:
            status === TransactionStatus.PENDING
              ? 'transaction.created'
              : `transaction.${status}`,
          title:
            status === TransactionStatus.PENDING
              ? `Transaction ${transactionId} created`
              : `Transaction ${transactionId} ${status}`,
          notes: `Status: ${status}`,
          visible: true,
        }),
      );
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 10),
    );
    const weekStart = startOfUtcWeek(now);
    const monthlyTransactions = Array.from({ length: 12 }, (_, index) => {
      const createdAt = addUtcDays(monthStart, index * 2);
      return {
        transactionId: `#TXN-MONTH-${String(index + 1).padStart(2, '0')}`,
        createdAt: createdAt > now ? now : createdAt,
        amount: 1500 + index * 325,
        status:
          index % 6 === 4
            ? TransactionStatus.REFUNDED
            : index % 5 === 3
              ? TransactionStatus.FAILED
              : TransactionStatus.COMPLETED,
        type:
          index % 6 === 4 ? TransactionType.REFUND : TransactionType.PAYMENT,
      };
    });
    const weeklyTransactions = Array.from({ length: 7 }, (_, index) => {
      const createdAt = addUtcDays(weekStart, index);
      createdAt.setUTCHours(9 + index, 30, 0, 0);
      return {
        transactionId: `#TXN-WEEK-${String(index + 1).padStart(2, '0')}`,
        createdAt: createdAt > now ? now : createdAt,
        amount: 875 + index * 210,
        status:
          index === 5
            ? TransactionStatus.REFUNDED
            : index === 6
              ? TransactionStatus.PENDING
              : TransactionStatus.COMPLETED,
        type: index === 5 ? TransactionType.REFUND : TransactionType.PAYMENT,
      };
    });

    for (const [index, seedTransaction] of [
      ...monthlyTransactions,
      ...weeklyTransactions,
    ].entries()) {
      if (
        await transactionRepository.findOne({
          where: { transactionId: seedTransaction.transactionId },
        })
      ) {
        continue;
      }
      const booking = bookings[index % bookings.length];
      const user = users[index % users.length];
      const transaction = await transactionRepository.save(
        transactionRepository.create({
          transactionId: seedTransaction.transactionId,
          bookingId: booking.id,
          userId: user.id,
          paymentMethodId: methods.get(user.id)?.id ?? null,
          type: seedTransaction.type,
          status: seedTransaction.status,
          amount: seedTransaction.amount.toFixed(2),
          currency: 'INR',
          reference: `demo_recent_${seedTransaction.transactionId.replace(
            /[^a-z0-9]/gi,
            '',
          )}`,
          description: `${booking.service} recent seed`,
          platformFee: (seedTransaction.amount * 0.025).toFixed(2),
          subtotal: seedTransaction.amount.toFixed(2),
          settledAt:
            seedTransaction.status === TransactionStatus.COMPLETED ||
            seedTransaction.status === TransactionStatus.REFUNDED
              ? seedTransaction.createdAt
              : null,
          createdAt: seedTransaction.createdAt,
        }),
      );
      await activityRepository.save(
        activityRepository.create({
          entityType: ActivityEntityType.TRANSACTION,
          entityId: transaction.id,
          userId: user.id,
          type:
            seedTransaction.status === TransactionStatus.PENDING
              ? 'transaction.created'
              : `transaction.${seedTransaction.status}`,
          title:
            seedTransaction.status === TransactionStatus.PENDING
              ? `Transaction ${seedTransaction.transactionId} created`
              : `Transaction ${seedTransaction.transactionId} ${seedTransaction.status}`,
          notes: 'Created from the recent transaction demo seed',
          visible: true,
          createdAt: seedTransaction.createdAt,
        }),
      );
    }

    const alertSeed = [
      {
        title: 'Server capacity at 92%',
        notes: 'Scale resources',
        type: 'system',
      },
      {
        title: '15 transactions pending',
        notes: 'Pending review',
        type: 'system',
      },
      {
        title: 'System maintenance scheduled',
        notes: 'Scheduled for Oct 5',
        type: 'system',
      },
      {
        title: 'Database backup completed',
        notes: 'All systems are protected',
        type: 'system',
      },
      {
        title: 'New security update available',
        notes: 'Review and apply the latest update',
        type: 'system',
      },
    ];
    for (const alert of alertSeed) {
      const existingAlert = await activityRepository.findOne({
        where: {
          entityType: ActivityEntityType.SYSTEM,
          title: alert.title,
        },
      });
      if (!existingAlert) {
        await activityRepository.save(
          activityRepository.create({
            entityType: ActivityEntityType.SYSTEM,
            entityId: null,
            userId: null,
            type: alert.type,
            title: alert.title,
            notes: alert.notes,
            visible: true,
          }),
        );
      }
    }

    console.log(
      `Seeded admin user ${adminEmail}, ${users.length} users, ${bookings.length} bookings, 50 base transactions, and ${monthlyTransactions.length + weeklyTransactions.length} recent transactions.`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
