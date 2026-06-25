import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReceivingReceipts1781643300000 implements MigrationInterface {
  public name = 'CreateReceivingReceipts1781643300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipts" (
        "id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "receipt_number" varchar(120) NOT NULL,
        "business_reference" varchar(180) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "status" varchar(40) NOT NULL,
        "core_flow_instance_id" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_receipts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_receipts_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receiving_sessions" (
        "id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "session_key" varchar(120) NOT NULL,
        "device_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "status" varchar(30) NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "started_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_receiving_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_receiving_sessions_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_receiving_sessions_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipt_lines" (
        "id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "line_number" integer NOT NULL,
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "expected_quantity" numeric(18,4) NOT NULL,
        "actual_quantity" numeric(18,4) NOT NULL,
        "status" varchar(40) NOT NULL,
        "manual_confirm" boolean NOT NULL DEFAULT false,
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "scan_evidence_json" jsonb,
        "discrepancy_signals" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "received_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "received_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receipt_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_receipt_lines_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_receipt_lines_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_receipt_lines_inbound_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipts_inbound_plan" ON "receipts" ("inbound_plan_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_receipts_owner_warehouse" ON "receipts" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receiving_sessions_plan_key" ON "receiving_sessions" ("inbound_plan_id", "session_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_receiving_sessions_receipt" ON "receiving_sessions" ("receipt_id")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_receipt_lines_receipt" ON "receipt_lines" ("receipt_id")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_receipt_lines_plan_line" ON "receipt_lines" ("inbound_plan_line_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipt_lines_idempotency" ON "receipt_lines" ("receipt_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipt_lines_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_receipt_lines_plan_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_receipt_lines_receipt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_receiving_sessions_receipt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receiving_sessions_plan_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_receipts_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipts_inbound_plan"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "receipt_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "receiving_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "receipts"`);
  }
}
