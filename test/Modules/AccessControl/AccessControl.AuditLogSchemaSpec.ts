import { QueryRunner } from 'typeorm';
import { CreateAuditLogAndImmutability1781633000000 } from '@shared/Database/Migrations/1781633000000-CreateAuditLogAndImmutability';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('CreateAuditLogAndImmutability migration (1781633000000)', () => {
  it('creates audit_logs with the §6.5 fields, indexes, and an immutability trigger', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateAuditLogAndImmutability1781633000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "audit_logs"');
    expect(sql).toContain('"occurred_at" timestamptz');
    expect(sql).toContain('"actor_user_id"');
    expect(sql).toContain('"before_json" jsonb');
    expect(sql).toContain('"after_json" jsonb');
    expect(sql).toContain('"reason_code_id"');
    expect(sql).toContain('"correlation_id"');
    expect(sql).toContain('CREATE INDEX "IDX_audit_logs_occurred_at"');
    expect(sql).toContain('CREATE INDEX "IDX_audit_logs_object"');
    expect(sql).toContain('FUNCTION "prevent_audit_log_update_delete"');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON "audit_logs"');
  });

  it('down() drops the trigger, function and table', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateAuditLogAndImmutability1781633000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP TRIGGER');
    expect(sql).toContain('DROP FUNCTION');
    expect(sql).toContain('DROP TABLE "audit_logs"');
  });
});
