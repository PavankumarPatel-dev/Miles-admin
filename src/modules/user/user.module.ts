import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAdminService } from './services/user-admin.service';
@Module({ imports: [TypeOrmModule.forFeature([User])], providers: [UserAdminService], exports: [UserAdminService] })
export class UserModule {}