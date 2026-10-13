import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../../../common/enums/booking-status.enum';

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Please enter a valid booking start date and time.' },
  )
  startAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Please enter a valid duration in hours.' },
  )
  duration?: number;

  @IsOptional()
  @IsEnum(BookingStatus, {
    message: 'Please choose an available booking status.',
  })
  status?: BookingStatus;
}
