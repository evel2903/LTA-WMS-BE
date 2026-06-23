import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateInboundPlans1781643000000 } from '@shared/Database/Migrations/1781643000000-CreateInboundPlans';
import { CreateReceivingReceipts1781643300000 } from '@shared/Database/Migrations/1781643300000-CreateReceivingReceipts';
import { CreateInboundDiscrepancies1781643600000 } from '@shared/Database/Migrations/1781643600000-CreateInboundDiscrepancies';
import { CreateQcTasksAndResults1781643900000 } from '@shared/Database/Migrations/1781643900000-CreateQcTasksAndResults';
import { InboundDiscrepancyOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundDiscrepancyOrmEntity';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';
import { QcResultOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcResultOrmEntity';
import { QcTaskOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcTaskOrmEntity';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { ReceivingSessionOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceivingSessionOrmEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { ReceiptDocumentStatus } from '@modules/Inbound/Domain/Enums/ReceiptDocumentStatus';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('Inbound schema registration', () => {
  it('registers Inbound ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([
        InboundPlanOrmEntity,
        InboundPlanLineOrmEntity,
        InboundDiscrepancyOrmEntity,
        QcTaskOrmEntity,
        QcResultOrmEntity,
        ReceivingSessionOrmEntity,
        ReceiptOrmEntity,
        ReceiptLineOrmEntity,
      ]),
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

  it('creates receiving session, receipt and receipt line tables with idempotency indexes', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateReceivingReceipts1781643300000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "receiving_sessions"');
    expect(sql).toContain('CREATE TABLE "receipts"');
    expect(sql).toContain('CREATE TABLE "receipt_lines"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receiving_sessions_plan_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receipt_lines_idempotency"');
  });

  it('creates inbound discrepancy table with idempotency, exception link and scope indexes', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundDiscrepancies1781643600000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "inbound_discrepancies"');
    expect(sql).toContain('"expected_quantity" numeric(18,4) NOT NULL');
    expect(sql).toContain('"actual_quantity" numeric(18,4) NOT NULL');
    expect(sql).toContain('CONSTRAINT "FK_inbound_discrepancies_exception"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_discrepancies_exception"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_discrepancies_owner_warehouse"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_discrepancies_idempotency"');
  });

  it('creates QC task and result tables with idempotency, split quantities and status targets', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateQcTasksAndResults1781643900000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "qc_tasks"');
    expect(sql).toContain('CREATE TABLE "qc_results"');
    expect(sql).toContain('"task_status" varchar(40) NOT NULL');
    expect(sql).toContain('"result_status" varchar(40) NOT NULL');
    expect(sql).toContain('"accepted_quantity" numeric(18,4) NOT NULL');
    expect(sql).toContain('"rejected_quantity" numeric(18,4) NOT NULL');
    expect(sql).toContain('"accepted_inventory_status_code" varchar(80)');
    expect(sql).toContain('"rejected_inventory_status_code" varchar(80)');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_qc_tasks_idempotency"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_qc_results_idempotency"');
    expect(sql).not.toContain('QC_PASSED');
    expect(sql).not.toContain('QC_REJECTED');
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
    expect(Object.values(ReceivingSessionStatus)).toEqual(['Open', 'Closed']);
    expect(Object.values(ReceiptDocumentStatus)).toEqual(['Open', 'PartiallyReceived', 'Received']);
    expect(Object.values(ReceiptLineStatus)).toEqual(['Received', 'Discrepancy']);
    expect(Object.values(QcTaskStatus)).toEqual([
      'NotRequired',
      'PendingQc',
      'InInspection',
      'Dispositioned',
      'Closed',
    ]);
    expect(Object.values(QcResultStatus)).toEqual(['Passed', 'ConditionalPassed', 'Failed', 'Hold']);
    expect(Object.values(QcDispositionCode)).toEqual(['Release', 'Hold', 'Quarantine', 'Reject', 'Damage']);
    expect([
      ...Object.values(InboundPlanDocumentStatus),
      ...Object.values(InboundGateInStatus),
      ...Object.values(ReceivingSessionStatus),
      ...Object.values(ReceiptDocumentStatus),
      ...Object.values(ReceiptLineStatus),
      ...Object.values(QcTaskStatus),
      ...Object.values(QcResultStatus),
      ...Object.values(QcDispositionCode),
    ]).not.toEqual(expect.arrayContaining(['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED', 'QC_PASSED', 'QC_REJECTED']));
  });
});
