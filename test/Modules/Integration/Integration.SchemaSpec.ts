import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateIntegrationSkeleton1781642200000 } from '@shared/Database/Migrations/1781642200000-CreateIntegrationSkeleton';
import { AddIntegrationDeadLetterLifecycle1781717800000 } from '@shared/Database/Migrations/1781717800000-AddIntegrationDeadLetterLifecycle';
import { AddIntegrationReconciliationWorkspace1781717900000 } from '@shared/Database/Migrations/1781717900000-AddIntegrationReconciliationWorkspace';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { IntegrationReconciliationItemOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationItemOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('Integration schema registration', () => {
  it('registers Integration ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([
        ImportBatchOrmEntity,
        InterfaceMessageOrmEntity,
        OutboxMessageOrmEntity,
        IntegrationReconciliationRunOrmEntity,
        IntegrationReconciliationItemOrmEntity,
      ]),
    );
  });

  it('creates integration tables, trace indexes and unique message guards', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateIntegrationSkeleton1781642200000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "integration_import_batches"');
    expect(sql).toContain('CREATE TABLE "integration_interface_messages"');
    expect(sql).toContain('CREATE TABLE "integration_outbox_messages"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_integration_interface_message_id"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_integration_outbox_message_id"');
    expect(sql).toContain('CREATE INDEX "IDX_integration_interface_business_reference"');
    expect(sql).toContain('CREATE INDEX "IDX_integration_outbox_business_reference"');
  });

  it('drops integration indexes and tables in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateIntegrationSkeleton1781642200000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."IDX_integration_outbox_business_reference"');
    expect(sql).toContain('DROP INDEX "public"."UQ_integration_outbox_message_id"');
    expect(sql).toContain('DROP INDEX "public"."IDX_integration_interface_business_reference"');
    expect(sql).toContain('DROP INDEX "public"."UQ_integration_interface_message_id"');
    expect(sql).toContain('DROP TABLE "integration_outbox_messages"');
    expect(sql).toContain('DROP TABLE "integration_interface_messages"');
    expect(sql).toContain('DROP TABLE "integration_import_batches"');
  });

  it('adds retry/dead-letter lifecycle columns and indexes without redefining InventoryStatus', async () => {
    const { runner, queries } = fakeRunner();
    await new AddIntegrationDeadLetterLifecycle1781717800000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "attempt_count"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "max_attempts"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "failure_category"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "dead_lettered_at"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "resolution_action"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "action_idempotency_key"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "action_payload_hash"');
    expect(sql).toContain('IDX_integration_outbox_dead_letter');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('SHIPPED');
  });

  it('creates reconciliation run/item tables and scoped idempotency without redefining InventoryStatus', async () => {
    const { runner, queries } = fakeRunner();
    await new AddIntegrationReconciliationWorkspace1781717900000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "integration_reconciliation_runs"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "integration_reconciliation_items"');
    expect(sql).toContain('"business_reference" varchar(120) NOT NULL');
    expect(sql).toContain('"warehouse_id" varchar(100) NOT NULL');
    expect(sql).toContain('"owner_id" varchar(100) NOT NULL DEFAULT \'\'');
    expect(sql).toContain('"idempotency_key" varchar(160) NOT NULL');
    expect(sql).toContain('ux_integration_reconciliation_runs_scope_idempotency');
    expect(sql).toContain('("business_reference", "warehouse_id", "owner_id", "idempotency_key")');
    expect(sql).toContain('ix_integration_reconciliation_items_run_status');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('SHIPPED');
  });
});
