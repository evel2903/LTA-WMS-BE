import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap } from 'rxjs';
import { LoggingService } from './LoggingService';

type RequestLike = { method?: string; originalUrl?: string; url?: string; user?: { UserId?: string } };
type ResponseLike = { statusCode?: number };

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.loggingService.LogRequest({
          Method: request.method ?? 'UNKNOWN',
          Url: request.originalUrl ?? request.url ?? 'UNKNOWN',
          StatusCode: response.statusCode ?? 0,
          DurationMs: durationMs,
          UserId: request.user?.UserId,
        });
      }),
      catchError((error) => {
        const durationMs = Date.now() - startedAt;
        this.loggingService.LogRequest({
          Method: request.method ?? 'UNKNOWN',
          Url: request.originalUrl ?? request.url ?? 'UNKNOWN',
          StatusCode: response.statusCode ?? 0,
          DurationMs: durationMs,
          UserId: request.user?.UserId,
        });
        throw error;
      }),
    );
  }
}
