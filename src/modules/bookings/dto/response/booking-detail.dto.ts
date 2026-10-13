import { Expose, Type } from 'class-transformer';

class BookingDetailUserDto {
  @Expose()
  name: string;
}

class BookingDetailTransactionDto {
  @Expose({ name: 'transactionId' })
  paymentId: string;

  @Expose({ name: 'status' })
  paymentStatus: string;
}

class BookingDetailActivityDto {
  @Expose()
  title: string;

  @Expose()
  createdAt: Date;

  @Expose()
  notes: string | null;
}

export class BookingDetailDto {
  @Expose()
  id: string;

  @Expose()
  bookingId: string;

  @Expose()
  service: string;

  @Expose()
  startAt: Date;

  @Expose()
  endAt: Date;

  @Expose()
  status: string;

  @Expose()
  amount: string;

  @Expose()
  currency: string;

  @Expose()
  @Type(() => BookingDetailUserDto)
  user?: BookingDetailUserDto;

  @Expose()
  @Type(() => BookingDetailActivityDto)
  events: BookingDetailActivityDto[];

  @Expose()
  @Type(() => BookingDetailTransactionDto)
  transactions: BookingDetailTransactionDto[];
}
