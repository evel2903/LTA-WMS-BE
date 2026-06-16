import { EnqueueExampleJobUseCase } from '../../../src/Modules/Jobs/Application/UseCases/EnqueueExampleJobUseCase';
import {
  EnqueueExampleJobRequest,
  EnqueueExampleJobResult,
  IExampleJobQueue,
} from '../../../src/Modules/Jobs/Domain/Interfaces/IExampleJobQueue';

class FakeQueue implements IExampleJobQueue {
  public Enqueue = jest.fn<Promise<EnqueueExampleJobResult>, [EnqueueExampleJobRequest]>();
}

describe('EnqueueExampleJobUseCase', () => {
  it('delegates to queue', async () => {
    const queue = new FakeQueue();
    queue.Enqueue.mockResolvedValue({ JobId: 'j1' });

    const useCase = new EnqueueExampleJobUseCase(queue);
    await expect(useCase.Execute({ Message: 'hi' })).resolves.toEqual({ JobId: 'j1' });
    expect(queue.Enqueue).toHaveBeenCalledWith({ Message: 'hi' });
  });
});
