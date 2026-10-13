import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserAdminService } from '../../user/services/user-admin.service';
import { AdminLoginDto } from '../dto/request/admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userAdminService: UserAdminService,
  ) {}

  async login(input: AdminLoginDto) {
    const user = await this.userAdminService.authenticateAdmin(
      input.email,
      input.password,
    );
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }

  async profile(userId: string) {
    return this.userAdminService.activeAdminProfile(userId);
  }
}
