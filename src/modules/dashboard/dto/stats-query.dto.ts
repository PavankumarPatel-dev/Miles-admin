import { IsIn, IsOptional } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsIn(['dashboard', 'users', 'transactions', 'bookings'])
  section: 'dashboard' | 'users' | 'transactions' | 'bookings' = 'dashboard';
}
