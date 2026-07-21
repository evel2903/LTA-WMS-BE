import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateInboundPlans1781643000000 } from '@shared/Database/Migrations/1781643000000-CreateInboundPlans';
import { CreateReceivingReceipts1781643300000 } from '@shared/Database/Migrations/1781643300000-CreateReceivingReceipts';
import { CreateInboundDiscrepancies1781643600000 } from '@shared/Database/Migrations/1781643600000-CreateInboundDiscrepancies';
import { CreateQcTasksAndResults1781643900000 } from '@shared/Database/Migrations/1781643900000-CreateQcTasksAndResults';
import { CreateInboundLpnsAndPutawayReleases1781644200000 } from '@shared/Database/Migrations/1781644200000-CreateInboundLpnsAndPutawayReleases';
import { ScopeManualPutawayReleaseUniqueness1784399999000 } from '@shared/Database/Migrations/1784399999000-ScopeManualPutawayReleaseUniqueness';
import { AllowManualInboundReceipts1784400000000 } from '@shared/Database/Migrations/1784400000000-AllowManualInboundReceipts';
import { ScopeManualReceiptIdempotency1784538535670 } from '@shared/Database/Migrations/1784538535670-ScopeManualReceiptIdempotency';
import { InboundDiscrepancyOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundDiscrepancyOrmEntity';
import { InboundLpnOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundLpnOrmEntity';
import { InboundPutawayReleaseOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPutawayReleaseOrmEntity';
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
import { EscapeReceiptLikePattern } from '@modules/Inbound/Infrastructure/Persistence/Repositories/ReceivingRepository';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

const normalizeMigrationSql = (queries: string[]) =>
  queries
    .join('\n')
    .replace(/\bIF NOT EXISTS\s+/g, '')
    .replace(/\bIF EXISTS\s+/g, '');

describe('Inbound schema registration', () => {
  it('registers Inbound ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([
        InboundPlanOrmEntity,
        InboundPlanLineOrmEntity,
        InboundDiscrepancyOrmEntity,
        InboundLpnOrmEntity,
        InboundPutawayReleaseOrmEntity,
        QcTaskOrmEntity,
        QcResultOrmEntity,
        ReceivingSessionOrmEntity,
        ReceiptOrmEntity,
        ReceiptLineOrmEntity,
      ]),
    );
  });

  it('keeps the manual receipt-number partial unique index in TypeORM metadata', () => {
    const index = getMetadataArgsStorage().indices.find(
      (candidate) => candidate.target === ReceiptOrmEntity && candidate.name === 'UQ_receipts_manual_number',
    );

    expect(index).toMatchObject({
      unique: true,
      where: '"inbound_plan_id" IS NULL',
    });
    expect(index?.columns).toEqual(['OwnerId', 'WarehouseId', 'ReceiptNumber']);
  });

  it('keeps the receipt idempotency unique index scoped to manual receipts in TypeORM metadata', () => {
    const index = getMetadataArgsStorage().indices.find(
      (candidate) => candidate.target === ReceiptOrmEntity && candidate.name === 'UQ_receipts_manual_idempotency',
    );

    expect(index).toMatchObject({
      unique: true,
      where: '"inbound_plan_id" IS NULL AND "idempotency_key" IS NOT NULL',
    });
    expect(index?.columns).toEqual(['OwnerId', 'WarehouseId', 'IdempotencyKey']);
  });

  it('keeps the putaway-release unique index scoped to manual receipt lines in TypeORM metadata', () => {
    const index = getMetadataArgsStorage().indices.find(
      (candidate) =>
        candidate.target === InboundPutawayReleaseOrmEntity &&
        candidate.name === 'UQ_inbound_putaway_releases_receipt_line',
    );

    expect(index).toMatchObject({ unique: true, where: '"inbound_plan_id" IS NULL' });
    expect(index?.columns).toEqual(['ReceiptLineId']);
  });

  it('rebuilds the receipt idempotency unique index for the manual path only', async () => {
    const { runner, queries } = fakeRunner();
    await new ScopeManualReceiptIdempotency1784538535670().up(runner);
    const sql = normalizeMigrationSql(queries);

    expect(sql).toContain('DROP INDEX "public"."UQ_receipts_manual_idempotency"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receipts_manual_idempotency"');
    expect(sql).toContain('WHERE "inbound_plan_id" IS NULL AND "idempotency_key" IS NOT NULL');
  });

  it('reserves the release-line unique index for manual receipt lines before IPR-02 migration runs', async () => {
    const { runner, queries } = fakeRunner();
    await new ScopeManualPutawayReleaseUniqueness1784399999000().up(runner);
    const sql = normalizeMigrationSql(queries);

    expect(sql).toContain('DROP INDEX "public"."UQ_inbound_putaway_releases_receipt_line"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_putaway_releases_receipt_line"');
    expect(sql).toContain('WHERE "inbound_plan_id" IS NULL');
  });

  it('escapes receipt search LIKE metacharacters as literals', () => {
    expect(EscapeReceiptLikePattern(String.raw`RCPT_100%\A`)).toBe(String.raw`RCPT\_100\%\\A`);
  });

  it('creates inbound plan tables and unique business-key index in migration', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundPlans1781643000000().up(runner);
    const sql = normalizeMigrationSql(queries);
    expect(sql).toContain('CREATE TABLE "inbound_plans"');
    expect(sql).toContain('CREATE TABLE "inbound_plan_lines"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_plans_business_key"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_plans_source_status"');
    expect(sql).toContain('CREATE INDEX "IDX_inbound_plan_lines_plan"');
  });

  it('drops inbound indexes and tables in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundPlans1781643000000().down(runner);
    const sql = normalizeMigrationSql(queries);
    expect(sql).toContain('DROP INDEX "public"."IDX_inbound_plan_lines_plan"');
    expect(sql).toContain('DROP INDEX "public"."IDX_inbound_plans_source_status"');
    expect(sql).toContain('DROP INDEX "public"."UQ_inbound_plans_business_key"');
    expect(sql).toContain('DROP TABLE "inbound_plan_lines"');
    expect(sql).toContain('DROP TABLE "inbound_plans"');
  });

  it('creates receiving session, receipt and receipt line tables with idempotency indexes', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateReceivingReceipts1781643300000().up(runner);
    const sql = normalizeMigrationSql(queries);
    expect(sql).toContain('CREATE TABLE "receiving_sessions"');
    expect(sql).toContain('CREATE TABLE "receipts"');
    expect(sql).toContain('CREATE TABLE "receipt_lines"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receiving_sessions_plan_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receipt_lines_idempotency"');
  });

  it('creates inbound discrepancy table with idempotency, exception link and scope indexes', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundDiscrepancies1781643600000().up(runner);
    const sql = normalizeMigrationSql(queries);
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
    const sql = normalizeMigrationSql(queries);
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

  it('creates inbound LPN and putaway release tables without adding InventoryStatus terms', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInboundLpnsAndPutawayReleases1781644200000().up(runner);
    const sql = normalizeMigrationSql(queries);
    expect(sql).toContain('CREATE TABLE "inbound_lpns"');
    expect(sql).toContain('CREATE TABLE "inbound_putaway_releases"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_lpns_scope_lpn"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_lpns_idempotency"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inbound_putaway_releases_idempotency"');
    expect(sql).toContain('"inventory_status_code" varchar(80) NOT NULL');
    expect(sql).not.toContain('LPN_READY');
    expect(sql).not.toContain('LABEL_PRINTED');
    expect(sql).not.toContain('PUTAWAY_RELEASED');
    expect(sql).not.toContain('PUTAWAY_IN_PROGRESS');
  });

  it('allows manual receipt lineage across all 9 plan, 7 plan-line and 2 expected-quantity columns', async () => {
    const { runner, queries } = fakeRunner();
    await new AllowManualInboundReceipts1784400000000().up(runner);
    const sql = normalizeMigrationSql(queries);
    for (const table of [
      'receipts',
      'receiving_sessions',
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      expect(sql).toContain(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_id" DROP NOT NULL`);
    }
    for (const table of [
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      expect(sql).toContain(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_line_id" DROP NOT NULL`);
    }
    expect(sql).toContain('ALTER TABLE "receipt_lines" ALTER COLUMN "expected_quantity" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "inbound_discrepancies" ALTER COLUMN "expected_quantity" DROP NOT NULL');
    expect(sql).toContain('ADD COLUMN "supplier_id" char(36)');
    expect(sql).toContain('ALTER COLUMN "supplier_id" SET NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receipts_manual_idempotency"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_receiving_sessions_receipt_key"');
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
    ]).not.toEqual(
      expect.arrayContaining([
        'SHIPPED',
        'GATE_OUT',
        'GOODS_ISSUE_POSTED',
        'QC_PASSED',
        'QC_REJECTED',
        'LPN_READY',
        'LABEL_PRINTED',
        'PUTAWAY_RELEASED',
        'PUTAWAY_IN_PROGRESS',
      ]),
    );
  });
});
