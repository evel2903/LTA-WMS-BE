import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '../../Domain/Interfaces/IExampleJobQueue';

export class EnqueueExampleJobUseCase {
  constructor(private readonly queue: IExampleJobQueue) {}

  public async Execute(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult> {
    return await this.queue.Enqueue(request);
  }
}
