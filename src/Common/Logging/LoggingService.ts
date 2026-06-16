import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger('App');

  public LogRequest(params: {
    Method: string;
    Url: string;
    StatusCode: number;
    DurationMs: number;
    UserId?: string;
  }): void {
    this.logger.log(params);
  }

  public LogError(params: {
    Method?: string;
    Url?: string;
    StatusCode?: number;
    Error: unknown;
    Stack?: string;
  }): void {
    this.logger.error(params.Error, params.Stack, JSON.stringify(params));
  }
}
