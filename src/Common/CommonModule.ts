import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from './Interceptors/ResponseInterceptor';
import { LoggingService } from './Logging/LoggingService';
import { RequestLoggingInterceptor } from './Logging/RequestLoggingInterceptor';

@Module({
  providers: [LoggingService, GlobalExceptionFilter, ResponseInterceptor, RequestLoggingInterceptor],
  exports: [LoggingService, GlobalExceptionFilter, ResponseInterceptor, RequestLoggingInterceptor],
})
export class CommonModule {}
