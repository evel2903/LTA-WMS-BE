import { QueryRunner } from 'typeorm';
import { AddAuditActorSnapshotProvenance1784742000000 } from '@shared/Database/Migrations/1784742000000-AddAuditActorSnapshotProvenance';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('AddAuditActorSnapshotProvenance migration', () => {
  it('backfills legacy provenance without UPDATE and enforces status/value consistency', async () => {
    const { runner, queries } = fakeRunner();
    await new AddAuditActorSnapshotProvenance1784742000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('actor_snapshot_status');
    expect(sql).toContain("DEFAULT 'legacy_unverified'");
    expect(sql).toContain('DROP DEFAULT');
    expect(sql).toContain('actor_role_codes');
    expect(sql).toContain('DROP NOT NULL');
    expect(sql).toContain('CHK_audit_logs_actor_snapshot_provenance');
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS "CHK_audit_logs_actor_snapshot_provenance"');
    expect(sql).toContain('jsonb_typeof');
    expect(sql).not.toMatch(/UPDATE\s+"?audit_logs"?/i);
  });

  it('fails closed on unresolved rows during down migration and never rewrites NULL to []', async () => {
    const { runner, queries } = fakeRunner();
    await new AddAuditActorSnapshotProvenance1784742000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).toMatch(/actor_role_codes"? IS NULL/i);
    expect(sql).not.toMatch(/UPDATE\s+"?audit_logs"?/i);
    expect(sql).toContain('SET NOT NULL');
    expect(sql).toContain("SET DEFAULT '[]'");
  });
});
