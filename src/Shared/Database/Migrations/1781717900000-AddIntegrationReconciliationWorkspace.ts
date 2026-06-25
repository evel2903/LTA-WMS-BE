import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntegrationReconciliationWorkspace1781717900000 implements MigrationInterface {
  public name = 'AddIntegrationReconciliationWorkspace1781717900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_reconciliation_runs" (
        "id" char(36) NOT NULL,
        "business_reference" varchar(120) NOT NULL,
        "warehouse_id" varchar(100) NOT NULL,
        "owner_id" varchar(100) NOT NULL DEFAULT '',
        "run_status" varchar(40) NOT NULL,
        "source_counts" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "item_count" integer NOT NULL DEFAULT 0,
        "mismatch_count" integer NOT NULL DEFAULT 0,
        "exception_count" integer NOT NULL DEFAULT 0,
        "idempotency_key" varchar(160) NOT NULL,
        "request_payload_hash" varchar(64) NOT NULL,
        "reason_code" varchar(80) NOT NULL,
        "reason_code_id" char(36),
        "reason_note" varchar(500),
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "resolved_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_reconciliation_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_reconciliation_items" (
        "id" char(36) NOT NULL,
        "run_id" char(36) NOT NULL,
        "item_status" varchar(40) NOT NULL,
        "severity" varchar(20) NOT NULL,
        "mismatch_type" varchar(80) NOT NULL,
        "source_type" varchar(80) NOT NULL,
        "source_id" varchar(160),
        "expected_summary" jsonb,
        "actual_summary" jsonb,
        "exception_case_id" char(36),
        "outbox_message_id" char(36),
        "dead_letter_message_id" char(36),
        "resolution_note" varchar(500),
        "resolution_idempotency_key" varchar(160),
        "resolution_payload_hash" varchar(64),
        "approval_request_id" char(36),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" varchar(500),
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "resolved_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_reconciliation_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_integration_reconciliation_runs_scope_idempotency"
        ON "integration_reconciliation_runs" ("business_reference", "warehouse_id", "owner_id", "idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_integration_reconciliation_runs_scope"
        ON "integration_reconciliation_runs" ("business_reference", "warehouse_id", "owner_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_integration_reconciliation_runs_status"
        ON "integration_reconciliation_runs" ("run_status", "updated_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_integration_reconciliation_items_run_status"
        ON "integration_reconciliation_items" ("run_id", "item_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."ix_integration_reconciliation_items_run_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."ix_integration_reconciliation_runs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."ix_integration_reconciliation_runs_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."ux_integration_reconciliation_runs_scope_idempotency"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_reconciliation_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_reconciliation_runs"`);
  }
}
