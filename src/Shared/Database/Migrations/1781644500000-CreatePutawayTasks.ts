import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePutawayTasks1781644500000 implements MigrationInterface {
  name = 'CreatePutawayTasks1781644500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "putaway_tasks" (
        "id" char(36) NOT NULL,
        "task_code" varchar(80) NOT NULL,
        "task_status" varchar(40) NOT NULL,
        "inbound_putaway_release_id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "inbound_lpn_id" char(36),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "lpn_code" varchar(80),
        "sscc_code" varchar(40),
        "inventory_status_code" varchar(80) NOT NULL,
        "source_location_id" char(36),
        "source_location_code" varchar(80),
        "target_location_id" char(36) NOT NULL,
        "target_location_code" varchar(80) NOT NULL,
        "target_location_profile_id" char(36),
        "priority" integer NOT NULL DEFAULT 50,
        "work_pool_code" varchar(80),
        "assigned_user_id" char(36),
        "constraint_json" jsonb,
        "eligibility_decision_json" jsonb,
        "outbox_message_id" char(36),
        "mobile_task_id" char(36),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "released_at" timestamptz NOT NULL,
        "released_by" char(36),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_putaway_tasks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_putaway_tasks_task_code" ON "putaway_tasks" ("task_code")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_putaway_tasks_inbound_release"
      ON "putaway_tasks" ("inbound_putaway_release_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_putaway_tasks_idempotency"
      ON "putaway_tasks" ("inbound_putaway_release_id", "idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_putaway_tasks_scope_status"
      ON "putaway_tasks" ("warehouse_id", "owner_id", "task_status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_putaway_tasks_target_location"
      ON "putaway_tasks" ("target_location_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_putaway_tasks_target_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_putaway_tasks_scope_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_putaway_tasks_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_putaway_tasks_inbound_release"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_putaway_tasks_task_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "putaway_tasks"`);
  }
}
