import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, OkResponse } from '../Responses/ApiResponse';

type AnyRecord = Record<string, unknown>;

const IsApiResponse = (value: unknown): value is ApiResponse<unknown> => {
  if (!value || typeof value !== 'object') return false;
  const record = value as AnyRecord;
  return typeof record.Success === 'boolean' && ('Data' in record || 'Errors' in record);
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (IsApiResponse(data)) return data;
        return OkResponse(data);
      }),
    );
  }
}
