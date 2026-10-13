import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Paginate } from 'nestjs-paginate/lib/decorator';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { Serialize } from '../../../common/interceptors/serialize.interceptor';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UserDeletedDto } from '../dto/response/user-deleted.dto';
import { UserDetailDto } from '../dto/response/user-detail.dto';
import { UserDto } from '../dto/response/user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { UserAdminService } from '../services/user-admin.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UserAdminService) {}

  @Get()
  @Serialize(UserDto, { paginated: true })
  list(@Paginate() query: PaginateQuery) {
    return this.users.list(query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @Serialize(UserDto)
  create(@Body() input: CreateUserDto) {
    return this.users.create(input);
  }

  @Get(':id')
  @Serialize(UserDetailDto)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.detail(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Serialize(UserDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateUserDto) {
    return this.users.update(id, input);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Serialize(UserDeletedDto)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.remove(id);
  }
}
