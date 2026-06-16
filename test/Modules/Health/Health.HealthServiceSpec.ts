import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from '../../../src/Modules/Health/Infrastructure/Services/HealthService';

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

  it('Ready returns ok when mysql up and redis not configured', async () => {
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
    expect(report.Details.mysql.Status).toBe('up');
    expect(report.Details.redis.Status).toBe('skipped');
  });

  it('Ready returns error when mysql is down', async () => {
    const dataSource = { query: jest.fn().mockRejectedValue(new Error('db down')) } as unknown as DataSource;
    const configService = { get: () => undefined } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);

    const report = await service.Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.mysql.Status).toBe('down');
  });
});
