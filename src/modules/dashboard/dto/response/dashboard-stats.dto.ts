import { Expose, Type } from 'class-transformer';

class UserStatsDto {
  @Expose()
  total: number;

  @Expose()
  active: number;

  @Expose()
  newThisMonth: number;

  @Expose()
  changePercent: number | null;
}

class BookingStatsDto {
  @Expose()
  active: number;

  @Expose()
  completed: number;

  @Expose()
  cancelled: number;
}

class CurrencyAmountDto {
  @Expose()
  currency: string;

  @Expose()
  amount: string;
}

class TransactionStatsDto {
  @Expose()
  total: number;

  @Expose()
  totalVolumeByCurrency: CurrencyAmountDto[];

  @Expose()
  averageTransactionByCurrency: CurrencyAmountDto[];

  @Expose()
  pending: number;

  @Expose()
  successRatePercent: number | null;

  @Expose()
  @Type(() => CurrencyAmountDto)
  averageAmountByCurrency: CurrencyAmountDto[];
}

class DashboardPeriodDto {
  @Expose()
  start: string;

  @Expose()
  end: string;
}

export class DashboardStatsDto {
  @Expose()
  @Type(() => UserStatsDto)
  users: UserStatsDto;

  @Expose()
  @Type(() => BookingStatsDto)
  bookings: BookingStatsDto;

  @Expose()
  @Type(() => TransactionStatsDto)
  transactions: TransactionStatsDto;

  @Expose()
  @Type(() => CurrencyAmountDto)
  revenueByCurrency: CurrencyAmountDto[];

  @Expose()
  @Type(() => DashboardPeriodDto)
  period: DashboardPeriodDto;
}
