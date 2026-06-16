import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../Constants/ErrorCode';
import { AppException } from '../Exceptions/AppException';
import { LoggingService } from '../Logging/LoggingService';
import { ApiError, ErrorResponse } from '../Responses/ApiResponse';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error } = this.mapException(exception);

    this.loggingService.LogError({
      Method: request.method,
      Url: request.originalUrl ?? request.url,
      StatusCode: statusCode,
      Error: error,
      Stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(statusCode).json(ErrorResponse([error]));
  }

  private mapException(exception: unknown): { statusCode: number; error: ApiError } {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.StatusCode,
        error: { Code: exception.ErrorCode, Message: exception.message, Details: exception.Details },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse() as
        | string
        | { message?: string | string[]; error?: string; statusCode?: number };

      const message = this.getHttpExceptionMessage(response);
      const code = this.mapHttpStatusToErrorCode(statusCode);

      return { statusCode, error: { Code: code, Message: message, Details: response } };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { Code: ErrorCode.Unknown, Message: 'Internal server error' },
    };
  }

  private getHttpExceptionMessage(
    response: string | { message?: string | string[]; error?: string; statusCode?: number },
  ): string {
    if (typeof response === 'string') return response;
    if (Array.isArray(response.message)) return response.message.join('; ');
    if (typeof response.message === 'string') return response.message;
    return 'Request failed';
  }

  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    if (status === HttpStatus.BAD_REQUEST) return ErrorCode.Validation;
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCode.Unauthorized;
    if (status === HttpStatus.FORBIDDEN) return ErrorCode.Forbidden;
    if (status === HttpStatus.NOT_FOUND) return ErrorCode.NotFound;
    if (status === HttpStatus.CONFLICT) return ErrorCode.Conflict;
    return ErrorCode.Unknown;
  }
}
