import { Expose, Type } from 'class-transformer';

class UserDto {
  @Expose()
  name: string;
}

export class TransactionDto {
  @Expose()
  id: string;

  @Expose()
  transactionId: string;

  @Expose()
  type: string;

  @Expose()
  status: string;

  @Expose()
  amount: string;

  @Expose()
  currency: string;

  @Expose()
  createdAt: string;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;
}
