import { Expose, Type } from 'class-transformer';

class ChartPointDto {
  @Expose()
  period: string;

  @Expose()
  label: string;

  @Expose()
  revenue: string;
}

class ChartSeriesDto {
  @Expose()
  currency: string;

  @Expose()
  @Type(() => ChartPointDto)
  points: ChartPointDto[];
}

export class DashboardChartsDto {
  @Expose()
  range: string;

  @Expose()
  startAt: string;

  @Expose()
  @Type(() => ChartSeriesDto)
  series: ChartSeriesDto[];
}
