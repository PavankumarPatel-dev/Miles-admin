import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { UserStatus } from '../../../../common/enums/user-status.enum';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Please enter your name.' })
  @Length(1, 150, {
    message: 'Your name must be between 1 and 150 characters.',
  })
  @IsOptional()
  name?: string;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    {
      message:
        'Please provide a complete web address starting with http:// or https://.',
    },
  )
  @IsOptional()
  avatarUrl?: string;

  @IsString({ message: 'Please enter a phone number.' })
  @Length(7, 20, {
    message: 'Your phone number must be between 7 and 20 characters.',
  })
  @IsOptional()
  phoneNumber?: string;

  @IsDateString(
    {},
    { message: 'Please enter your date of birth in a valid date format.' },
  )
  @IsOptional()
  dateOfBirth?: string;

  @IsString({ message: 'Please enter an address.' })
  @IsOptional()
  address?: string;

  @IsEnum(UserRole, { message: 'Please choose an available account role.' })
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus, { message: 'Please choose an available account status.' })
  @IsOptional()
  status?: UserStatus;

  @IsBoolean({ message: 'Please choose whether the account is confirmed.' })
  @IsOptional()
  isConfirmed?: boolean;

  @IsBoolean({
    message: 'Please choose whether two-factor authentication is enabled.',
  })
  @IsOptional()
  isTwoFactorEnabled?: boolean;

  @IsDateString(
    {},
    { message: 'Please enter the joining date in a valid date format.' },
  )
  @IsOptional()
  joiningDate?: string;
}
