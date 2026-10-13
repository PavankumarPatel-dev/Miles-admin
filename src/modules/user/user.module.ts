import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { UsersController } from './controllers/users.controller';
import { UserAdminService } from './services/user-admin.service';
import { BookingsModule } from '../bookings/bookings.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  providers: [UserAdminService],
  controllers: [UsersController],
  exports: [UserAdminService],
  imports: [
    TypeOrmModule.forFeature([User, ActivityLog]),
    forwardRef(() => BookingsModule),
    forwardRef(() => TransactionsModule),
  ],
})
export class UserModule {}
