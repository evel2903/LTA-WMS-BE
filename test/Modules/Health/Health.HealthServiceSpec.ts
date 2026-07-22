import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from '@modules/Health/Infrastructure/Services/HealthService';

const roleCatalogConstraints = [
  { Name: 'PK_role_catalog_versions', Definition: 'PRIMARY KEY (id)' },
  { Name: 'CHK_role_catalog_versions_singleton', Definition: 'CHECK ((id = 1))' },
  { Name: 'CHK_role_catalog_versions_nonnegative', Definition: 'CHECK ((version >= 0))' },
];

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

    const dataSource = {
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes('pg_constraint')
            ? roleCatalogConstraints
            : sql.includes('role_catalog_versions')
              ? [{ Id: 1, Version: '0' }]
              : [{ '1': 1 }],
        ),
      ),
    } as unknown as DataSource;
    const configService = {
      get: (key: string) =>
        key === 'RoleCatalog'
          ? { ActiveKid: 'v1', Keys: { v1: 'catalog-health-secret-32-bytes-aaaa' }, Valid: true }
          : undefined,
    } as unknown as ConfigService;
    const service = new HealthService(dataSource, configService);

    const report = await service.Ready();
    expect(report.Status).toBe('ok');
    expect(report.Details.postgres.Status).toBe('up');
    expect(report.Details.redis.Status).toBe('skipped');
    expect(report.Details.role_catalog.Status).toBe('up');
  });

  it('Ready reports role catalog down when signing configuration is missing', async () => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 1,
      external: 0,
      arrayBuffers: 0,
    });
    const dataSource = { query: jest.fn().mockResolvedValue([{ Version: '0' }]) } as unknown as DataSource;
    const configService = { get: () => undefined } as unknown as ConfigService;
    const report = await new HealthService(dataSource, configService).Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.role_catalog.Status).toBe('down');
  });

  it('Ready reports role catalog down when an extra singleton row exists', async () => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 1,
      external: 0,
      arrayBuffers: 0,
    });
    const dataSource = {
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes('pg_constraint')
            ? roleCatalogConstraints
            : sql.includes('role_catalog_versions')
              ? [
                  { Id: 1, Version: '0' },
                  { Id: 2, Version: '0' },
                ]
              : [{ '1': 1 }],
        ),
      ),
    } as unknown as DataSource;
    const configService = {
      get: (key: string) =>
        key === 'RoleCatalog'
          ? { ActiveKid: 'v1', Keys: { v1: 'catalog-health-secret-32-bytes-aaaa' }, Valid: true }
          : undefined,
    } as unknown as ConfigService;

    const report = await new HealthService(dataSource, configService).Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.role_catalog.Status).toBe('down');
  });

  it('Ready reports role catalog down when singleton constraints are missing', async () => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 1,
      external: 0,
      arrayBuffers: 0,
    });
    const dataSource = {
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes('pg_constraint')
            ? []
            : sql.includes('role_catalog_versions')
              ? [{ Id: 1, Version: '0' }]
              : [{ '1': 1 }],
        ),
      ),
    } as unknown as DataSource;
    const configService = {
      get: (key: string) =>
        key === 'RoleCatalog'
          ? { ActiveKid: 'v1', Keys: { v1: 'catalog-health-secret-32-bytes-aaaa' }, Valid: true }
          : undefined,
    } as unknown as ConfigService;

    const report = await new HealthService(dataSource, configService).Ready();
    expect(report.Status).toBe('error');
    expect(report.Details.role_catalog.Status).toBe('down');
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
