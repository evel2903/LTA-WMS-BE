import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '../../Domain/Interfaces/IExampleJobQueue';

@Injectable()
export class BullMqExampleJobQueue implements IExampleJobQueue {
  constructor(@InjectQueue('example') private readonly exampleQueue: Queue) {}

  public async Enqueue(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult> {
    const job = await this.exampleQueue.add('ExampleJob', request, {
      removeOnComplete: true,
      removeOnFail: 100,
    });
    return { JobId: String(job.id) };
  }
}
