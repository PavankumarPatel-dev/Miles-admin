import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { UserStatus } from '../../../../common/enums/user-status.enum';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Please enter an email address.' })
  email: string;

  @IsString({ message: 'Please enter your name.' })
  @Length(1, 150, {
    message: 'Your name must be between 1 and 150 characters.',
  })
  name: string;

  @IsString({ message: 'Please enter a password.' })
  @MinLength(8, {
    message: 'Your password must be at least 8 characters long.',
  })
  password: string;

  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    {
      message:
        'Please provide a complete web address starting with http:// or https://.',
    },
  )
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'Please enter a phone number.' })
  @Length(7, 20, {
    message: 'Your phone number must be between 7 and 20 characters.',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Please enter your date of birth in a valid date format.' },
  )
  dateOfBirth?: string;

  @IsOptional()
  @IsString({ message: 'Please enter an address.' })
  address?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Please choose an available account role.' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Please choose an available account status.' })
  status?: UserStatus;

  @IsOptional()
  @IsBoolean({ message: 'Please choose whether the account is confirmed.' })
  isConfirmed?: boolean;

  @IsOptional()
  @IsBoolean({
    message: 'Please choose whether two-factor authentication is enabled.',
  })
  isTwoFactorEnabled?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Please enter the joining date in a valid date format.' },
  )
  joiningDate?: string;
}
