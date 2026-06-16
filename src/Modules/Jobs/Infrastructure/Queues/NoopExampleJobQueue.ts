import { Injectable } from '@nestjs/common';
import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '../../Domain/Interfaces/IExampleJobQueue';

@Injectable()
export class NoopExampleJobQueue implements IExampleJobQueue {
  public async Enqueue(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult> {
    void request;
    return { JobId: 'disabled' };
  }
}
