import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { BookingsModule } from '../bookings/bookings.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [UserModule, BookingsModule, TransactionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
