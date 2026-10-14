import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { formatValidationErrors } from './utils/helper';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          message: formatValidationErrors(errors),
        }),
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(Number(process.env.BACKEND_PORT));

  Logger.log(
    `API listening on http://${process.env.HOST || 'localhost'}:${process.env.BACKEND_PORT || 3000}`,
  );
}
void bootstrap();
