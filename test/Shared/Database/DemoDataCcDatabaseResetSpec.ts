import {
  BuildDemoDataCcTruncateSql,
  DemoDataCcProtectedTables,
  QuotePostgresIdentifier,
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
});
