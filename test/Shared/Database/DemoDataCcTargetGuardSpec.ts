import {
  AssertDemoDataCcLocalTarget,
  BuildDemoDataCcTargetSummary,
  FormatDemoDataCcTargetSummary,
  ValidateDemoDataCcTarget,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

describe('DemoDataCcTargetGuard', () => {
  const baseTarget = {
    NodeEnv: 'development' as const,
    DbHost: 'localhost',
    DbPort: 5432,
    DbDatabase: 'backend_seed',
  };

  it('allows a verified local development database target', () => {
    const target = AssertDemoDataCcLocalTarget(baseTarget, '.env.local');

    expect(target).toEqual({
      NodeEnv: 'development',
      DbHost: 'localhost',
      DbPort: 5432,
      DbDatabase: 'backend_seed',
      EnvSource: '.env.local',
    });
  });

  it('formats a target summary without secrets', () => {
    const summary = FormatDemoDataCcTargetSummary(BuildDemoDataCcTargetSummary(baseTarget, '.env.local'));

    expect(summary).toBe(
      'NODE_ENV=development DB_HOST=localhost DB_PORT=5432 DB_DATABASE=backend_seed ENV_SOURCE=.env.local',
    );
    expect(summary).not.toContain('password');
    expect(summary).not.toContain('secret');
  });

  it.each(['prod', 'production', 'staging', 'stage', 'uat', 'live'])(
    'rejects database names containing forbidden term %s',
    (term) => {
      expect(() =>
        ValidateDemoDataCcTarget({
          ...BuildDemoDataCcTargetSummary(baseTarget),
          DbDatabase: `wms_${term}`,
        }),
      ).toThrow(`DB_DATABASE contains forbidden term "${term}"`);
    },
  );

  it('rejects non-local database hosts', () => {
    expect(() =>
      ValidateDemoDataCcTarget({
        ...BuildDemoDataCcTargetSummary(baseTarget),
        DbHost: 'demo.company.example',
      }),
    ).toThrow('DB_HOST=demo.company.example is not an allowed local target');
  });

  it('rejects production node environment', () => {
    expect(() =>
      ValidateDemoDataCcTarget({
        ...BuildDemoDataCcTargetSummary(baseTarget),
        NodeEnv: 'production',
      }),
    ).toThrow('NODE_ENV=production is not allowed');
  });

  it('rejects missing host and database name', () => {
    expect(() =>
      ValidateDemoDataCcTarget({
        ...BuildDemoDataCcTargetSummary(baseTarget),
        DbHost: '',
      }),
    ).toThrow('DB_HOST is required');

    expect(() =>
      ValidateDemoDataCcTarget({
        ...BuildDemoDataCcTargetSummary(baseTarget),
        DbDatabase: '',
      }),
    ).toThrow('DB_DATABASE is required');
  });
});
