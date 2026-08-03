import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly isProduction: boolean = false) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      // In production, never leak internal error messages to clients
      if (this.isProduction) {
        message = 'Internal server error';
        this.logger.error(
          `[UnhandledException] ${exception.message}`,
          exception.stack,
        );
      } else {
        message = exception.message;
      }
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
