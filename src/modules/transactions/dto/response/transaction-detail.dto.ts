import { Expose, Transform, Type } from 'class-transformer';

class TransactionDetailUserDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  email: string;
}

class TransactionDetailPaymentMethodDto {
  @Expose()
  id: string;

  @Expose()
  provider: string;

  @Expose()
  cardType: string;

  @Expose()
  lastFourDigit: string | null;
}

class TransactionEventDto {
  @Expose()
  title: string;

  @Expose()
  notes: string | null;

  @Expose()
  createdAt: Date;
}

class RelatedPaymentMethodDto {
  @Expose()
  cardType: string;

  @Expose()
  lastFourDigit: string | null;
}

class RelatedTransactionDto {
  @Expose()
  transactionId: string;

  @Expose()
  @Type(() => RelatedPaymentMethodDto)
  paymentMethod: RelatedPaymentMethodDto | null;

  @Expose()
  amount: string;

  @Expose()
  status: string;

  @Expose()
  settledAt: Date | null;
}

export class TransactionDetailDto {
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
  reference: string | null;

  @Expose()
  description: string | null;

  @Expose()
  platformFee: string;

  @Expose()
  subtotal: string;

  @Expose()
  @Transform(({ obj }) => Number(obj.subtotal) + Number(obj.platformFee))
  grandTotal: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => TransactionDetailUserDto)
  user: TransactionDetailUserDto;

  @Expose()
  @Type(() => TransactionDetailPaymentMethodDto)
  paymentMethod: TransactionDetailPaymentMethodDto | null;

  @Expose()
  @Type(() => TransactionEventDto)
  events: TransactionEventDto[];

  @Expose()
  @Type(() => RelatedTransactionDto)
  relatedTransactions: RelatedTransactionDto[];
}
