import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInboundDiscrepancies1781643600000 implements MigrationInterface {
  public name = 'CreateInboundDiscrepancies1781643600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_discrepancies" (
        "id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "discrepancy_type" varchar(60) NOT NULL,
        "signals" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" varchar(40) NOT NULL,
        "severity" varchar(20) NOT NULL,
        "tolerance_decision" varchar(60) NOT NULL,
        "expected_quantity" numeric(18,4) NOT NULL,
        "actual_quantity" numeric(18,4) NOT NULL,
        "reason_code" varchar(80) NOT NULL,
        "reason_code_id" char(36) NOT NULL,
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "evidence_json" jsonb,
        "exception_case_id" char(36) NOT NULL,
        "exception_state" varchar(60) NOT NULL,
        "idempotency_key" varchar(160) NOT NULL,
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "recorded_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_discrepancies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inbound_discrepancies_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_discrepancies_receipt_line" FOREIGN KEY ("receipt_line_id")
          REFERENCES "receipt_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_discrepancies_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_discrepancies_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_discrepancies_exception" FOREIGN KEY ("exception_case_id")
          REFERENCES "exception_cases"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_discrepancies_receipt" ON "inbound_discrepancies" ("receipt_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_discrepancies_line" ON "inbound_discrepancies" ("receipt_line_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_discrepancies_exception" ON "inbound_discrepancies" ("exception_case_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_discrepancies_owner_warehouse" ON "inbound_discrepancies" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_discrepancies_idempotency" ON "inbound_discrepancies" ("receipt_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_discrepancies_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_discrepancies_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_discrepancies_exception"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_discrepancies_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_discrepancies_receipt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_discrepancies"`);
  }
}
