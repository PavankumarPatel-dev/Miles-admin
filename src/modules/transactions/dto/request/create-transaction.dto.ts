import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { TransactionStatus } from '../../../../common/enums/transaction-status.enum';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class CreateTransactionDto {
  @IsUUID(undefined, { message: 'Please select a valid user.' })
  userId: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'Please select a valid booking.' })
  bookingId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'Please select a valid payment method.' })
  paymentMethodId?: string;

  @IsEnum(TransactionType, {
    message: 'Please choose an available transaction type.',
  })
  type: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: 'Please choose an available transaction status.',
  })
  status?: TransactionStatus;

  @IsString({ message: 'Please enter the transaction amount.' })
  @Matches(/^-?\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'Enter an amount with no more than 2 decimal places.',
  })
  amount: string;

  @IsOptional()
  @IsString({ message: 'Please enter a currency code.' })
  @Length(3, 3, { message: 'The currency code must contain 3 characters.' })
  currency?: string;

  @IsOptional()
  @IsString({ message: 'Please enter a transaction reference.' })
  @MaxLength(255, { message: 'The reference must not exceed 255 characters.' })
  reference?: string;

  @IsOptional()
  @IsString({ message: 'Please enter a transaction description.' })
  @MaxLength(255, {
    message: 'The description must not exceed 255 characters.',
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Please enter the platform fee.' })
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'Enter a non-negative fee with no more than 2 decimal places.',
  })
  platformFee?: string;

  @IsOptional()
  @IsString({ message: 'Please enter the subtotal.' })
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/, {
    message:
      'Enter a non-negative subtotal with no more than 2 decimal places.',
  })
  subtotal?: string;
}
