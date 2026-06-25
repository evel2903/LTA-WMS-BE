import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReplenishmentTasks1781644900000 implements MigrationInterface {
  name = 'CreateReplenishmentTasks1781644900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "replenishment_tasks" (
        "id" char(36) NOT NULL,
        "task_code" varchar(80) NOT NULL,
        "task_status" varchar(40) NOT NULL,
        "trigger_type" varchar(40) NOT NULL,
        "source_balance_id" char(36) NOT NULL,
        "source_dimension_id" char(36) NOT NULL,
        "source_location_id" char(36) NOT NULL,
        "source_location_code" varchar(80),
        "source_inventory_status_code" varchar(80) NOT NULL,
        "target_location_id" char(36) NOT NULL,
        "target_location_code" varchar(80),
        "target_location_profile_id" char(36),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36),
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "short_pick_reference" varchar(160),
        "priority" int,
        "work_pool_code" varchar(80),
        "assigned_user_id" char(36),
        "eligibility_decision_json" jsonb,
        "outbox_message_id" char(36),
        "confirm_transaction_id" char(36),
        "confirm_movement_id" char(36),
        "confirm_outbox_message_id" char(36),
        "release_idempotency_key" varchar(160) NOT NULL,
        "release_payload_fingerprint" varchar(64) NOT NULL,
        "confirm_idempotency_key" varchar(160),
        "confirm_payload_fingerprint" varchar(64),
        "cancel_idempotency_key" varchar(160),
        "cancel_payload_fingerprint" varchar(64),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "released_at" timestamptz,
        "released_by" char(36),
        "confirmed_at" timestamptz,
        "confirmed_by" char(36),
        "cancelled_at" timestamptz,
        "cancelled_by" char(36),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_replenishment_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_replenishment_tasks_task_code" UNIQUE ("task_code"),
        CONSTRAINT "UQ_replenishment_tasks_release_idempotency" UNIQUE ("release_idempotency_key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_replenishment_tasks_scope_status" ON "replenishment_tasks" ("warehouse_id", "owner_id", "task_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_replenishment_tasks_source_balance" ON "replenishment_tasks" ("source_balance_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_replenishment_tasks_target_location" ON "replenishment_tasks" ("target_location_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_replenishment_tasks_confirm_idempotency" ON "replenishment_tasks" ("confirm_idempotency_key") WHERE "confirm_idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_replenishment_tasks_cancel_idempotency" ON "replenishment_tasks" ("cancel_idempotency_key") WHERE "cancel_idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "FK_replenishment_tasks_source_balance" FOREIGN KEY ("source_balance_id") REFERENCES "inventory_balances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "FK_replenishment_tasks_source_dimension" FOREIGN KEY ("source_dimension_id") REFERENCES "inventory_dimensions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "FK_replenishment_tasks_source_location" FOREIGN KEY ("source_location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "FK_replenishment_tasks_target_location" FOREIGN KEY ("target_location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "FK_replenishment_tasks_confirm_transaction" FOREIGN KEY ("confirm_transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" DROP CONSTRAINT IF EXISTS "FK_replenishment_tasks_confirm_transaction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" DROP CONSTRAINT IF EXISTS "FK_replenishment_tasks_target_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" DROP CONSTRAINT IF EXISTS "FK_replenishment_tasks_source_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" DROP CONSTRAINT IF EXISTS "FK_replenishment_tasks_source_dimension"`,
    );
    await queryRunner.query(
      `ALTER TABLE "replenishment_tasks" DROP CONSTRAINT IF EXISTS "FK_replenishment_tasks_source_balance"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_replenishment_tasks_cancel_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_replenishment_tasks_confirm_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_replenishment_tasks_target_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_replenishment_tasks_source_balance"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_replenishment_tasks_scope_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "replenishment_tasks"`);
  }
}
