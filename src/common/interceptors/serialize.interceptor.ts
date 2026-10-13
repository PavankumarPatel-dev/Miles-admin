import {
  NestInterceptor,
  UseInterceptors,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { Request, Response } from 'express';

interface ClassConstructor<T = any> {
  new (...args: any[]): T;
}

interface SerializeOptions {
  paginated?: boolean;
}

// Custom decorator
export function Serialize<T>(
  dto?: ClassConstructor<T>,
  options: SerializeOptions = {},
) {
  return UseInterceptors(new SerializeInterceptor(dto, options));
}

export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(
    private readonly dto?: ClassConstructor<T>,
    private readonly options: SerializeOptions = {},
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: any) => {
        const defaultMessages: Record<string, string> = {
          GET: 'Data fetched successfully',
          POST: 'Created successfully',
          PUT: 'Updated successfully',
          PATCH: 'Updated successfully',
          DELETE: 'Deleted successfully',
        };

        if (data?.statusCode !== undefined) {
          response.status(data.statusCode);
        }

        const message =
          data?.message ||
          defaultMessages[request.method] ||
          'Operation successful';

        const responseData = data?.payload ?? data;
        const transform = (value: unknown) =>
          this.dto
            ? plainToInstance(this.dto, value, {
                excludeExtraneousValues: true,
              })
            : value;
        const payload = this.options.paginated
          ? {
              ...responseData,
              data: transform(responseData?.data ?? []),
            }
          : transform(responseData);

        return {
          statusCode: response.statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
          payload,
        };
      }),
    );
  }
}
