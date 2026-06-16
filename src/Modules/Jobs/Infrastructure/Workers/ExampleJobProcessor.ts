import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggingService } from '../../../../Common/Logging/LoggingService';

@Processor('example')
export class ExampleJobProcessor extends WorkerHost {
  constructor(private readonly loggingService: LoggingService) {
    super();
  }

  public async process(job: Job<{ Message: string }>): Promise<void> {
    this.loggingService.LogRequest({
      Method: 'JOB',
      Url: `example:${job.name}`,
      StatusCode: 200,
      DurationMs: 0,
      UserId: undefined,
    });
    this.loggingService.LogRequest({
      Method: 'JOB',
      Url: `Payload:${job.data.Message}`,
      StatusCode: 200,
      DurationMs: 0,
      UserId: undefined,
    });
  }
}
