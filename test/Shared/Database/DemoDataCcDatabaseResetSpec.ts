import {
  BuildDemoDataCcTruncateSql,
  DemoDataCcProtectedTables,
  QuotePostgresIdentifier,
  ResetDemoDataCcLocalDatabase,
} from '@shared/Database/Seed/DemoDataCcDatabaseReset';

describe('DemoDataCcDatabaseReset', () => {
  it('builds a truncate statement that protects the migrations table', () => {
    const sql = BuildDemoDataCcTruncateSql(['users', 'migrations', 'warehouses']);

    expect(sql).toBe('TRUNCATE TABLE public."users", public."warehouses" RESTART IDENTITY CASCADE');
    expect(sql).not.toContain('migrations');
    expect(DemoDataCcProtectedTables).toEqual(['migrations']);
  });

  it('returns null when there are no resettable tables', () => {
    expect(BuildDemoDataCcTruncateSql(['migrations'])).toBeNull();
  });

  it('quotes postgres identifiers safely', () => {
    expect(QuotePostgresIdentifier('demo"table')).toBe('"demo""table"');
  });

  it('validates the actual DataSource target before listing or truncating tables', async () => {
    const previousEnv = {
      DB_DATABASE: process.env.DB_DATABASE,
      DB_HOST: process.env.DB_HOST,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_PORT: process.env.DB_PORT,
      DB_USERNAME: process.env.DB_USERNAME,
      JWT_EXPIRATION: process.env.JWT_EXPIRATION,
      JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    };
    Object.assign(process.env, {
      DB_DATABASE: 'backend_seed',
      DB_HOST: 'localhost',
      DB_PASSWORD: 'postgres',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'development',
      PORT: '3000',
    });
    delete process.env.JWT_REFRESH_EXPIRATION;

    const dataSource = {
      options: {
        type: 'postgres',
        host: 'prod.database.internal',
        port: 5432,
        database: 'backend_seed',
      },
      query: jest.fn(),
    };

    try {
      await expect(ResetDemoDataCcLocalDatabase(dataSource as never)).rejects.toThrow('not an allowed local target');
      expect(dataSource.query).not.toHaveBeenCalled();
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
