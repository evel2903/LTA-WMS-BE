import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShippingPackageStaging1781645600000 implements MigrationInterface {
  name = 'CreateShippingPackageStaging1781645600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shipping_package_staging (
        id char(36) PRIMARY KEY,
        staging_code varchar(80) NOT NULL,
        package_id char(36) NOT NULL,
        package_code varchar(80) NOT NULL,
        outbound_order_id char(36) NOT NULL,
        warehouse_profile_id char(36) NOT NULL,
        warehouse_id char(36),
        warehouse_code varchar(80),
        owner_id char(36),
        owner_code varchar(80),
        status varchar(40) NOT NULL,
        inventory_status_code varchar(50),
        shipment_reference varchar(120),
        staging_lane_code varchar(80) NOT NULL,
        staging_location_id char(36),
        staging_location_code varchar(80),
        dock_door_id char(36),
        dock_door_code varchar(80),
        truck_reference varchar(120),
        vehicle_number varchar(80),
        driver_name varchar(120),
        carrier_id char(36),
        carrier_code varchar(80),
        core_flow_instance_id char(36),
        stage_idempotency_key varchar(180) NOT NULL,
        stage_payload_fingerprint varchar(64) NOT NULL,
        dock_idempotency_key varchar(180),
        dock_payload_fingerprint varchar(64),
        truck_idempotency_key varchar(180),
        truck_payload_fingerprint varchar(64),
        reason_code varchar(80),
        reason_code_id char(36),
        reason_note text,
        evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
        staged_at timestamptz NOT NULL,
        staged_by char(36),
        dock_assigned_at timestamptz,
        dock_assigned_by char(36),
        truck_assigned_at timestamptz,
        truck_assigned_by char(36),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by char(36),
        updated_by char(36)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS UQ_shipping_package_staging_package ON shipping_package_staging(package_id)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS UQ_shipping_package_staging_stage_idempotency ON shipping_package_staging(stage_idempotency_key)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_shipping_package_staging_order_status ON shipping_package_staging(outbound_order_id, status)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_shipping_package_staging_owner_warehouse ON shipping_package_staging(owner_id, warehouse_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_shipping_package_staging_owner_warehouse');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_shipping_package_staging_order_status');
    await queryRunner.query('DROP INDEX IF EXISTS UQ_shipping_package_staging_stage_idempotency');
    await queryRunner.query('DROP INDEX IF EXISTS UQ_shipping_package_staging_package');
    await queryRunner.query('DROP TABLE IF EXISTS shipping_package_staging');
  }
}
