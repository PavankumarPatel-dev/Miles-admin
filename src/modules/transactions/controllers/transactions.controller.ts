import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Paginate } from 'nestjs-paginate/lib/decorator';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { Serialize } from '../../../common/interceptors/serialize.interceptor';
import { CreateTransactionDto } from '../dto/request/create-transaction.dto';
import { TransactionDetailDto } from '../dto/response/transaction-detail.dto';
import { TransactionDto } from '../dto/response/transaction.dto';
import { TransactionsService } from '../services/transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @Serialize(TransactionDto, { paginated: true })
  list(@Paginate() query: PaginateQuery) {
    return this.transactions.list(query);
  }

  @Post()
  @Serialize(TransactionDto)
  create(@Body() input: CreateTransactionDto) {
    return this.transactions.create(input);
  }

  @Get(':id')
  @Serialize(TransactionDetailDto)
  detail(@Param('id') id: string) {
    return this.transactions.detail(id);
  }

  @Patch(':id/status')
  @Serialize(TransactionDetailDto)
  refund(@Param('id') id: string) {
    return this.transactions.refund(id);
  }
}
