import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { User } from '../entities/user.entity';
@Injectable()
export class UserAdminService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}
  async authenticateAdmin(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: email.toLowerCase(), role: UserRole.ADMIN } });
    if (!user || user.status !== UserStatus.ACTIVE || !(await compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return user;
  }
}