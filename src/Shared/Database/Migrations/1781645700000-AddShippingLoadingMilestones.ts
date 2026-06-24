import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingLoadingMilestones1781645700000 implements MigrationInterface {
  name = 'AddShippingLoadingMilestones1781645700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipping_package_staging
        ADD COLUMN IF NOT EXISTS loading_idempotency_key varchar(180),
        ADD COLUMN IF NOT EXISTS loading_payload_fingerprint varchar(64),
        ADD COLUMN IF NOT EXISTS shipment_confirm_idempotency_key varchar(180),
        ADD COLUMN IF NOT EXISTS shipment_confirm_payload_fingerprint varchar(64),
        ADD COLUMN IF NOT EXISTS load_reference varchar(120),
        ADD COLUMN IF NOT EXISTS loaded_at timestamptz,
        ADD COLUMN IF NOT EXISTS loaded_by char(36),
        ADD COLUMN IF NOT EXISTS shipment_confirmed_at timestamptz,
        ADD COLUMN IF NOT EXISTS shipment_confirmed_by char(36),
        ADD COLUMN IF NOT EXISTS loading_outbox_message_id char(36),
        ADD COLUMN IF NOT EXISTS shipment_confirm_outbox_message_id char(36)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_shipping_package_staging_loading_idempotency
      ON shipping_package_staging(loading_idempotency_key)
      WHERE loading_idempotency_key IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_shipping_package_staging_confirm_idempotency
      ON shipping_package_staging(shipment_confirm_idempotency_key)
      WHERE shipment_confirm_idempotency_key IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_shipping_package_staging_shipment_status
      ON shipping_package_staging(shipment_reference, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_shipping_package_staging_shipment_status');
    await queryRunner.query('DROP INDEX IF EXISTS UQ_shipping_package_staging_confirm_idempotency');
    await queryRunner.query('DROP INDEX IF EXISTS UQ_shipping_package_staging_loading_idempotency');
    await queryRunner.query(`
      ALTER TABLE shipping_package_staging
        DROP COLUMN IF EXISTS shipment_confirmed_by,
        DROP COLUMN IF EXISTS shipment_confirmed_at,
        DROP COLUMN IF EXISTS loaded_by,
        DROP COLUMN IF EXISTS loaded_at,
        DROP COLUMN IF EXISTS load_reference,
        DROP COLUMN IF EXISTS shipment_confirm_outbox_message_id,
        DROP COLUMN IF EXISTS loading_outbox_message_id,
        DROP COLUMN IF EXISTS shipment_confirm_payload_fingerprint,
        DROP COLUMN IF EXISTS shipment_confirm_idempotency_key,
        DROP COLUMN IF EXISTS loading_payload_fingerprint,
        DROP COLUMN IF EXISTS loading_idempotency_key
    `);
  }
}
