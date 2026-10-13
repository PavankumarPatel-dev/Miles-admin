import { DataSource } from 'typeorm';
import { User } from '../modules/user/entities/user.entity';
import { ActivityLog } from '../modules/user/entities/activity-log.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { PaymentMethod } from '../modules/transactions/entities/payment-method.entity';
import { Transaction } from '../modules/transactions/entities/transaction.entity';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env from project root
config({
  path: path.resolve(__dirname, '../../.env'),
});
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'miles_admin',
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [User, ActivityLog, Booking, PaymentMethod, Transaction],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
});
