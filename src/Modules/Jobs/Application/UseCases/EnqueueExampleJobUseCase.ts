import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '@modules/Jobs/Application/Interfaces/IExampleJobQueue';

export class EnqueueExampleJobUseCase {
  constructor(private readonly queue: IExampleJobQueue) {}

  public async Execute(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult> {
    return await this.queue.Enqueue(request);
  }
}
