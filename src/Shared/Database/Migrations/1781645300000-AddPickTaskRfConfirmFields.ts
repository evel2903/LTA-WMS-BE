import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPickTaskRfConfirmFields1781645300000 implements MigrationInterface {
  public name = 'AddPickTaskRfConfirmFields1781645300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outbound_pick_tasks"
        ADD COLUMN IF NOT EXISTS "completed_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "completed_by" char(36),
        ADD COLUMN IF NOT EXISTS "confirm_idempotency_key" varchar(180),
        ADD COLUMN IF NOT EXISTS "confirm_payload_fingerprint" varchar(64),
        ADD COLUMN IF NOT EXISTS "confirm_outbox_message_id" char(36),
        ADD COLUMN IF NOT EXISTS "confirm_inventory_transaction_id" char(36),
        ADD COLUMN IF NOT EXISTS "confirm_result_json" jsonb
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mobile_tasks_source_document"
        ON "mobile_tasks" ("source_document_type", "source_document_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_outbound_pick_tasks_confirm_idempotency"
        ON "outbound_pick_tasks" ("confirm_idempotency_key")
        WHERE "confirm_idempotency_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_outbound_pick_tasks_confirm_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_mobile_tasks_source_document"`);
    await queryRunner.query(`
      ALTER TABLE "outbound_pick_tasks"
        DROP COLUMN IF EXISTS "confirm_inventory_transaction_id",
        DROP COLUMN IF EXISTS "confirm_result_json",
        DROP COLUMN IF EXISTS "confirm_outbox_message_id",
        DROP COLUMN IF EXISTS "confirm_payload_fingerprint",
        DROP COLUMN IF EXISTS "confirm_idempotency_key",
        DROP COLUMN IF EXISTS "completed_by",
        DROP COLUMN IF EXISTS "completed_at"
    `);
  }
}
