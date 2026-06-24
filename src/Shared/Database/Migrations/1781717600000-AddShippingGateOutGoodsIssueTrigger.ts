import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingGateOutGoodsIssueTrigger1781717600000 implements MigrationInterface {
  name = 'AddShippingGateOutGoodsIssueTrigger1781717600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipping_package_staging"
        ADD COLUMN IF NOT EXISTS "gate_out_idempotency_key" varchar(180),
        ADD COLUMN IF NOT EXISTS "gate_out_payload_fingerprint" varchar(64),
        ADD COLUMN IF NOT EXISTS "goods_issue_trigger_idempotency_key" varchar(180),
        ADD COLUMN IF NOT EXISTS "goods_issue_trigger_payload_fingerprint" varchar(64),
        ADD COLUMN IF NOT EXISTS "gate_out_reference" varchar(120),
        ADD COLUMN IF NOT EXISTS "gate_out_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "gate_out_by" char(36),
        ADD COLUMN IF NOT EXISTS "goods_issue_trigger" varchar(40),
        ADD COLUMN IF NOT EXISTS "goods_issue_trigger_status" varchar(40),
        ADD COLUMN IF NOT EXISTS "goods_issue_triggered_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "goods_issue_triggered_by" char(36),
        ADD COLUMN IF NOT EXISTS "gate_out_outbox_message_id" char(36),
        ADD COLUMN IF NOT EXISTS "goods_issue_trigger_outbox_message_id" char(36)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shipping_package_staging_gate_out_idempotency"
        ON "shipping_package_staging" ("gate_out_idempotency_key")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shipping_package_staging_gi_trigger_idempotency"
        ON "shipping_package_staging" ("goods_issue_trigger_idempotency_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_shipping_package_staging_gi_trigger_idempotency"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_shipping_package_staging_gate_out_idempotency"');
    await queryRunner.query(`
      ALTER TABLE "shipping_package_staging"
        DROP COLUMN IF EXISTS "goods_issue_trigger_outbox_message_id",
        DROP COLUMN IF EXISTS "gate_out_outbox_message_id",
        DROP COLUMN IF EXISTS "goods_issue_triggered_by",
        DROP COLUMN IF EXISTS "goods_issue_triggered_at",
        DROP COLUMN IF EXISTS "goods_issue_trigger_status",
        DROP COLUMN IF EXISTS "goods_issue_trigger",
        DROP COLUMN IF EXISTS "gate_out_by",
        DROP COLUMN IF EXISTS "gate_out_at",
        DROP COLUMN IF EXISTS "gate_out_reference",
        DROP COLUMN IF EXISTS "goods_issue_trigger_payload_fingerprint",
        DROP COLUMN IF EXISTS "goods_issue_trigger_idempotency_key",
        DROP COLUMN IF EXISTS "gate_out_payload_fingerprint",
        DROP COLUMN IF EXISTS "gate_out_idempotency_key"
    `);
  }
}
