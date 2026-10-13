import { Controller, Get } from '@nestjs/common';
import { Serialize } from '../../common/interceptors/serialize.interceptor';
import { Public } from '../../common/decorators/public.decorator';
import { HealthResponseDto } from './dto/response/health-response.dto';

@Controller()
@Public()
export class AppController {
  @Get('health')
  @Serialize(HealthResponseDto)
  healthCheck() {
    return { message: 'ok' };
  }
}
