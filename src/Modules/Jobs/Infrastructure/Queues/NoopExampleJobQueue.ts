import { Injectable } from '@nestjs/common';
import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '@modules/Jobs/Application/Interfaces/IExampleJobQueue';

@Injectable()
export class NoopExampleJobQueue implements IExampleJobQueue {
  public async Enqueue(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult> {
    void request;
    return { JobId: 'disabled' };
  }
}
