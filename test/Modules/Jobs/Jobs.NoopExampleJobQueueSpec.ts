import { NoopExampleJobQueue } from '@modules/Jobs/Infrastructure/Queues/NoopExampleJobQueue';

describe('NoopExampleJobQueue', () => {
  it('returns disabled job id', async () => {
    const queue = new NoopExampleJobQueue();
    await expect(queue.Enqueue({ Message: 'x' })).resolves.toEqual({ JobId: 'disabled' });
  });
});
