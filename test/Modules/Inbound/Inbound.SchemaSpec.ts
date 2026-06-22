import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateInboundPlans1781643000000 } from '@shared/Database/Migrations/1781643000000-CreateInboundPlans';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('Inbound schema registration', () => {
  it('registers Inbound ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([InboundPlanOrmEntity, InboundPlanLineOrmEntity]),
    );
  });

  it('creates inbound plan tables and unique business-key index in migration', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundPlans1781643000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "inbound_plans"');
    expect(sql).toContain('CREATE TABLE "inbound_plan_lines"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_plans_business_key"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_plans_source_status"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_plan_lines_plan"');
  });

  it('drops inbound indexes and tables in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundPlans1781643000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."IDX_inbound_plan_lines_plan"');
    expect(sql).toContain('DROP INDEX "public"."IDX_inbound_plans_source_status"');
    expect(sql).toContain('DROP INDEX "public"."UQ_inbound_plans_business_key"');
    expect(sql).toContain('DROP TABLE "inbound_plan_lines"');
    expect(sql).toContain('DROP TABLE "inbound_plans"');
  });

  it('keeps inbound document and gate states separate from InventoryStatus terms', () => {
    expect(Object.values(InboundPlanDocumentStatus)).toEqual(
      expect.arrayContaining([
        'Draft',
        'Planned',
        'Confirmed',
        'Receiving',
        'PartiallyReceived',
        'Received',
        'Closed',
        'Cancelled',
      ]),
    );
    expect(Object.values(InboundGateInStatus)).toEqual(['NotRecorded', 'Recorded', 'OverrideAccepted']);
    expect([...Object.values(InboundPlanDocumentStatus), ...Object.values(InboundGateInStatus)]).not.toEqual(
      expect.arrayContaining(['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']),
    );
  });
});
