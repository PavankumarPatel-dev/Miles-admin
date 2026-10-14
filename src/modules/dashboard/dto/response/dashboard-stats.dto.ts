import { Expose, Type } from 'class-transformer';

class MetricValueDto {
  @Expose()
  value: number;

  @Expose()
  changePercentage: number | null;
}

class CurrencyAmountDto {
  @Expose()
  currency: string;

  @Expose()
  amount: string;
}

class CurrencyRevenueDto extends CurrencyAmountDto {
  @Expose()
  changePercentage: number | null;
}

class DashboardPeriodDto {
  @Expose()
  start: string;

  @Expose()
  end: string;
}

export class DashboardStatsDto {
  @Expose()
  totalUsers: number | MetricValueDto;

  @Expose()
  activeUsers: number;

  @Expose()
  newThisMonth: number;

  @Expose()
  @Type(() => CurrencyRevenueDto)
  totalRevenue: CurrencyRevenueDto[];

  @Expose()
  @Type(() => MetricValueDto)
  activeBookings: MetricValueDto;

  @Expose()
  @Type(() => MetricValueDto)
  pendingTransactions: MetricValueDto;

  @Expose()
  @Type(() => MetricValueDto)
  totalBookings: MetricValueDto;

  @Expose()
  @Type(() => MetricValueDto)
  completedBookings: MetricValueDto;

  @Expose()
  @Type(() => MetricValueDto)
  cancelledBookings: MetricValueDto;

  @Expose()
  totalTransactions: number;

  @Expose()
  @Type(() => CurrencyAmountDto)
  totalVolume: CurrencyAmountDto[];

  @Expose()
  @Type(() => CurrencyAmountDto)
  averageTransaction: CurrencyAmountDto[];

  @Expose()
  successRate: number | null;

  @Expose()
  period: DashboardPeriodDto;
}
