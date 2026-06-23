import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCycleCountWorks1781644800000 implements MigrationInterface {
  name = 'CreateCycleCountWorks1781644800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cycle_count_works" (
        "id" char(36) NOT NULL,
        "count_code" varchar(80) NOT NULL,
        "work_status" varchar(40) NOT NULL,
        "source_balance_id" char(36) NOT NULL,
        "locked_balance_id" char(36),
        "original_inventory_status_code" varchar(80) NOT NULL,
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "location_id" char(36) NOT NULL,
        "location_code" varchar(80),
        "uom_id" char(36),
        "uom_code" varchar(40),
        "lpn_code" varchar(80),
        "expected_quantity" numeric(18,4) NOT NULL,
        "counted_quantity" numeric(18,4),
        "variance_quantity" numeric(18,4),
        "tolerance_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "approval_request_id" char(36),
        "lock_transaction_id" char(36),
        "submit_idempotency_key" varchar(160),
        "submit_payload_fingerprint" varchar(64),
        "adjustment_transaction_id" char(36),
        "adjustment_idempotency_key" varchar(160),
        "adjustment_payload_fingerprint" varchar(64),
        "unlock_transaction_id" char(36),
        "unlock_idempotency_key" varchar(160),
        "unlock_payload_fingerprint" varchar(64),
        "create_idempotency_key" varchar(160) NOT NULL,
        "create_payload_fingerprint" varchar(64) NOT NULL,
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_cycle_count_works" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cycle_count_works_count_code" UNIQUE ("count_code"),
        CONSTRAINT "UQ_cycle_count_works_create_idempotency" UNIQUE ("create_idempotency_key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cycle_count_works_scope_status" ON "cycle_count_works" ("warehouse_id", "owner_id", "work_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cycle_count_works_source_balance" ON "cycle_count_works" ("source_balance_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cycle_count_works_locked_balance" ON "cycle_count_works" ("locked_balance_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cycle_count_works_submit_idempotency" ON "cycle_count_works" ("submit_idempotency_key") WHERE "submit_idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cycle_count_works_adjustment_idempotency" ON "cycle_count_works" ("adjustment_idempotency_key") WHERE "adjustment_idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cycle_count_works_unlock_idempotency" ON "cycle_count_works" ("unlock_idempotency_key") WHERE "unlock_idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_source_balance" FOREIGN KEY ("source_balance_id") REFERENCES "inventory_balances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_locked_balance" FOREIGN KEY ("locked_balance_id") REFERENCES "inventory_balances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_lock_transaction" FOREIGN KEY ("lock_transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_adjustment_transaction" FOREIGN KEY ("adjustment_transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_unlock_transaction" FOREIGN KEY ("unlock_transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" ADD CONSTRAINT "FK_cycle_count_works_approval_request" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_approval_request"`);
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_unlock_transaction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_adjustment_transaction"`,
    );
    await queryRunner.query(`ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_lock_transaction"`);
    await queryRunner.query(`ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_locked_balance"`);
    await queryRunner.query(`ALTER TABLE "cycle_count_works" DROP CONSTRAINT "FK_cycle_count_works_source_balance"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_cycle_count_works_unlock_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_cycle_count_works_adjustment_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_cycle_count_works_submit_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cycle_count_works_locked_balance"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cycle_count_works_source_balance"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cycle_count_works_scope_status"`);
    await queryRunner.query(`DROP TABLE "cycle_count_works"`);
  }
}
