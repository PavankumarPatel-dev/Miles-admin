import { Expose, Type } from 'class-transformer';
import { UserDto } from './user.dto';

class UserDetailTransactionDto {
  @Expose()
  id: string;

  @Expose()
  transactionId: string;

  @Expose()
  amount: string;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;
}

class UserDetailBookingDto {
  @Expose()
  id: string;

  @Expose()
  bookingId: string;

  @Expose()
  service: string;

  @Expose()
  status: string;

  @Expose()
  startAt: Date;

  @Expose()
  endAt: Date;
}

class UserDetailActivityDto {
  @Expose()
  title: string;

  @Expose()
  notes: string | null;

  @Expose()
  createdAt: Date;
}

export class UserDetailDto extends UserDto {
  @Expose()
  completedBookings: number;

  @Expose()
  @Type(() => UserDetailTransactionDto)
  recentTransactions: UserDetailTransactionDto[];

  @Expose()
  @Type(() => UserDetailBookingDto)
  recentBookings: UserDetailBookingDto[];

  @Expose()
  @Type(() => UserDetailActivityDto)
  activity: UserDetailActivityDto[];
}
