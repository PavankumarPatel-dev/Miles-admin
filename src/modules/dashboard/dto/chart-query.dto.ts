import { IsIn, IsOptional } from 'class-validator';

export class ChartQueryDto {
  @IsOptional()
  @IsIn(['7d', '1m', '3m', '6m', '1y'])
  range: '7d' | '1m' | '3m' | '6m' | '1y' = '6m';
}
