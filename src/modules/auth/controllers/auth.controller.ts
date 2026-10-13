import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Serialize } from '../../../common/interceptors/serialize.interceptor';
import type { AuthenticatedUser } from '../../../common/guards/jwt-auth.guard';
import { AdminLoginDto } from '../dto/request/admin-login.dto';
import { LoginResponseDto } from '../dto/response/login-response.dto';
import { UserDto } from '../../user/dto/response/user.dto';
import { AuthService } from '../services/admin-auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Serialize(LoginResponseDto)
  async login(@Body() body: AdminLoginDto) {
    return {
      message: 'Login successfully',
      payload: await this.authService.login(body),
    };
  }

  @Get('me')
  @Serialize(UserDto)
  me(@AuthUser() user: AuthenticatedUser) {
    return this.authService.profile(user.id);
  }
}
