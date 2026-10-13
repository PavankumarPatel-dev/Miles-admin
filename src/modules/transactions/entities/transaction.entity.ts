import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentMethod } from './payment-method.entity';

@Entity('transactions')
@Index(
  'IDX_transactions_dashboard',
  ['createdAt', 'status', 'type', 'currency', 'amount'],
  { where: '"deletedAt" IS NULL' },
)
@Index(
  'IDX_transactions_dashboard_revenue',
  ['createdAt', 'currency', 'amount'],
  {
    where:
      '"deletedAt" IS NULL AND "status" = \'completed\' AND "type" = \'payment\'',
  },
)
@Index('IDX_transactions_user', ['userId'])
@Index('IDX_transactions_booking', ['bookingId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    default: () =>
      "'#TXN-' || lpad(nextval('transactions_public_id_seq')::text, 4, '0')",
  })
  transactionId: string;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentMethodId: string | null;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  platformFee: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  subtotal: string;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking | null;

  @ManyToOne(() => PaymentMethod, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod: PaymentMethod | null;
}
