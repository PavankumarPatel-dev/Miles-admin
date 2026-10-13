import { Expose } from 'class-transformer';

export class DashboardAlertDto {
  @Expose()
  title: string;

  @Expose()
  notes: string | null;

  @Expose()
  createdAt: Date;
}
