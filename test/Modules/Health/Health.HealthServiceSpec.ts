import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from '@modules/Health/Infrastructure/Services/HealthService';

describe('HealthService', () => {
  let memoryUsageSpy: jest.SpyInstance;

  afterEach(() => {
    memoryUsageSpy?.mockRestore();
  });

  it('Live returns OK', async () => {
    const dataSource = { query: jest.fn() } as unknown as DataSource;
    const configService = { get: jest.fn() } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);
    await expect(service.Live()).resolves.toEqual({ Status: 'OK' });
  });

  it('Ready returns ok when postgres up and redis not configured', async () => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 1,
      external: 0,
      arrayBuffers: 0,
    });

    const dataSource = { query: jest.fn().mockResolvedValue([{ '1': 1 }]) } as unknown as DataSource;
    const configService = {
      get: (key: string) => (key === 'Redis.Url' ? undefined : undefined),
    } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);

    const report = await service.Ready();
    expect(report.Status).toBe('ok');
    expect(report.Details.postgres.Status).toBe('up');
    expect(report.Details.redis.Status).toBe('skipped');
  });

  it('Ready uses configured memory heap limit and reports memory details', async () => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 2 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    });

    const dataSource = { query: jest.fn().mockResolvedValue([{ '1': 1 }]) } as unknown as DataSource;
    const configService = {
      get: (key: string) => (key === 'HEALTH_MEMORY_HEAP_LIMIT_MB' ? 1 : undefined),
    } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);

    const report = await service.Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.postgres.Status).toBe('up');
    expect(report.Details.memory_heap.Status).toBe('down');
    expect(report.Details.memory_heap.Details).toEqual({ Used: 2 * 1024 * 1024, Limit: 1024 * 1024 });
  });

  it('Ready returns error when postgres is down', async () => {
    const dataSource = { query: jest.fn().mockRejectedValue(new Error('db down')) } as unknown as DataSource;
    const configService = { get: () => undefined } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);

    const report = await service.Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.postgres.Status).toBe('down');
  });
});
