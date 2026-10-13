import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../../../common/enums/booking-status.enum';

export class CreateBookingDto {
  @IsUUID(undefined, { message: 'Please select a valid user.' })
  userId: string;

  @IsString({ message: 'Please enter a service name.' })
  @Length(1, 255, {
    message: 'The service name must be between 1 and 255 characters.',
  })
  service: string;

  @IsDateString(
    {},
    { message: 'Please enter a valid booking start date and time.' },
  )
  startAt: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Please enter a valid duration in hours.' },
  )
  duration: number;

  @IsOptional()
  @IsEnum(BookingStatus, {
    message: 'Please choose an available booking status.',
  })
  status?: BookingStatus;

  @IsString({ message: 'Please enter the booking amount.' })
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'Enter a positive amount with no more than 2 decimal places.',
  })
  amount: string;

  @IsOptional()
  @IsString({ message: 'Please enter a currency code.' })
  @Length(3, 3, { message: 'The currency code must contain 3 characters.' })
  currency?: string;

  @IsOptional()
  @IsIn(['virtual', 'in_person'], {
    message: 'Please choose either a virtual or in-person meeting.',
  })
  meetingType?: string;

  @IsOptional()
  @IsString({ message: 'Please enter a meeting location.' })
  meetingLocation?: string;

  @IsOptional()
  @IsString({ message: 'Please enter a meeting link.' })
  meetingUrl?: string;

  @IsOptional()
  @IsString({ message: 'Please enter booking notes.' })
  @MaxLength(5000, {
    message: 'Booking notes must not exceed 5000 characters.',
  })
  notes?: string;
}
