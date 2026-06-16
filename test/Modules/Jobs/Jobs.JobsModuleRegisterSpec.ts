import { JobsModule } from '../../../src/Modules/Jobs/JobsModule';
import { EXAMPLE_JOB_QUEUE } from '../../../src/Modules/Jobs/Domain/Interfaces/IExampleJobQueue';
import { NoopExampleJobQueue } from '../../../src/Modules/Jobs/Infrastructure/Queues/NoopExampleJobQueue';
import { JobsController } from '../../../src/Modules/Jobs/Presentation/Controllers/JobsController';

describe('JobsModule.Register', () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('returns noop module when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL;
    const dynamic = JobsModule.Register();

    expect(dynamic.controllers ?? []).toHaveLength(0);
    const provider = (dynamic.providers ?? []).find((p) => {
      if (typeof p !== 'object' || p === null) return false;
      const record = p as unknown as Record<string, unknown>;
      return record.provide === EXAMPLE_JOB_QUEUE;
    }) as unknown as { useClass?: unknown } | undefined;

    expect(provider?.useClass).toBe(NoopExampleJobQueue);
  });

  it('returns bullmq-backed module when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://redis:6379';
    const dynamic = JobsModule.Register();
    expect(dynamic.controllers).toEqual([JobsController]);
    expect(dynamic.imports && dynamic.imports.length > 0).toBe(true);
  });
});
