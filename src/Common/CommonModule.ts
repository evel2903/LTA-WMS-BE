import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { LoggingService } from '@common/Logging/LoggingService';
import { RequestLoggingInterceptor } from '@common/Logging/RequestLoggingInterceptor';

@Module({
  providers: [LoggingService, GlobalExceptionFilter, ResponseInterceptor, RequestLoggingInterceptor],
  exports: [LoggingService, GlobalExceptionFilter, ResponseInterceptor, RequestLoggingInterceptor],
})
export class CommonModule {}
