import { QueryRunner } from 'typeorm';
import { CreateReasonCodeCatalog1781632000000 } from '@shared/Database/Migrations/1781632000000-CreateReasonCodeCatalog';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('CreateReasonCodeCatalog migration (1781632000000)', () => {
  it('creates reason_codes with code unique + group index', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateReasonCodeCatalog1781632000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "reason_codes"');
    expect(sql).toContain('"reason_code" varchar(60) NOT NULL');
    expect(sql).toContain('"reason_group"');
    expect(sql).toContain('"applies_to_actions" jsonb');
    expect(sql).toContain('"applies_to_objects" jsonb');
    expect(sql).toContain('"evidence_required" boolean');
    expect(sql).toContain('"approval_required" boolean');
    expect(sql).toContain('CONSTRAINT "UQ_reason_codes_code" UNIQUE ("reason_code")');
    expect(sql).toContain('CREATE INDEX "IDX_reason_codes_group"');
  });

  it('down() drops the index and table', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateReasonCodeCatalog1781632000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX');
    expect(sql).toContain('DROP TABLE "reason_codes"');
  });
});
