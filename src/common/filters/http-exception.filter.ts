import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    let error: unknown = 'Internal Server Error';
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === 'object' && response !== null
          ? (response as { message?: unknown; error?: unknown })
          : undefined;
      message = body?.message ?? response;
      error = body?.error ?? HttpStatus[statusCode] ?? exception.name;
    } else {
      const databaseCode = (exception as { driverError?: { code?: string } })
        ?.driverError?.code;
      if (databaseCode === '23505' || databaseCode === '23503') {
        statusCode = HttpStatus.CONFLICT;
        message = 'The request conflicts with existing data';
        error = 'Conflict';
      } else {
        console.error('Unhandled Exception:', exception);
      }
    }

    return res.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: req.originalUrl || req.url,
    });
  }
}
