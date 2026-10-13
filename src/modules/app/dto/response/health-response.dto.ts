import { Expose } from 'class-transformer';

export class HealthResponseDto {
  @Expose()
  message: string;
}
