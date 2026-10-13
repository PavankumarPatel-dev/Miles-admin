import { Expose, Type } from 'class-transformer';
import { UserDto } from '../../../user/dto/response/user.dto';

export class LoginResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  tokenType: string;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;
}
