import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboundPackingTables1781645500000 implements MigrationInterface {
  name = 'CreateOutboundPackingTables1781645500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbound_pack_sessions (
        id char(36) PRIMARY KEY,
        session_number varchar(80) NOT NULL,
        pick_task_id char(36) NOT NULL,
        mobile_task_id char(36),
        outbound_order_id char(36) NOT NULL,
        warehouse_profile_id char(36) NOT NULL,
        warehouse_id char(36),
        warehouse_code varchar(80),
        owner_id char(36),
        owner_code varchar(80),
        status varchar(40) NOT NULL,
        check_required boolean NOT NULL DEFAULT false,
        check_result varchar(40) NOT NULL,
        check_exception_case_id char(36),
        check_reason_code varchar(80),
        check_reason_code_id char(36),
        check_reason_note text,
        check_evidence_refs jsonb,
        check_payload_json jsonb,
        check_idempotency_key varchar(180),
        check_payload_fingerprint varchar(64),
        started_at timestamptz NOT NULL,
        started_by char(36),
        checked_at timestamptz,
        checked_by char(36),
        idempotency_key varchar(180) NOT NULL,
        payload_fingerprint varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbound_packages (
        id char(36) PRIMARY KEY,
        package_code varchar(80) NOT NULL,
        pack_session_id char(36) NOT NULL,
        pick_task_id char(36) NOT NULL,
        outbound_order_id char(36) NOT NULL,
        warehouse_profile_id char(36) NOT NULL,
        warehouse_id char(36),
        warehouse_code varchar(80),
        owner_id char(36),
        owner_code varchar(80),
        status varchar(40) NOT NULL,
        check_required boolean NOT NULL DEFAULT false,
        check_result varchar(40) NOT NULL,
        carton_type varchar(80) NOT NULL,
        weight numeric(18,4),
        length numeric(18,4),
        width numeric(18,4),
        height numeric(18,4),
        label_blocking_decision varchar(40),
        label_print_job_id char(36),
        label_print_job_code varchar(80),
        ready_for_staging_idempotency_key varchar(180),
        ready_for_staging_payload_fingerprint varchar(64),
        close_idempotency_key varchar(180),
        close_payload_fingerprint varchar(64),
        closed_at timestamptz,
        closed_by char(36),
        ready_for_staging_at timestamptz,
        ready_for_staging_by char(36),
        idempotency_key varchar(180) NOT NULL,
        payload_fingerprint varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by char(36),
        updated_by char(36)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbound_package_contents (
        id char(36) PRIMARY KEY,
        package_id char(36) NOT NULL,
        pick_task_id char(36) NOT NULL,
        outbound_order_line_id char(36) NOT NULL,
        source_balance_id char(36) NOT NULL,
        source_dimension_id char(36) NOT NULL,
        sku_id char(36) NOT NULL,
        sku_code varchar(80),
        uom_id char(36) NOT NULL,
        uom_code varchar(40),
        quantity numeric(18,4) NOT NULL,
        inventory_status_code varchar(50),
        lot_number varchar(100),
        serial_number varchar(100),
        expiry_date date,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS IDX_outbound_pack_sessions_idempotency ON outbound_pack_sessions(idempotency_key)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_pack_sessions_pick_task ON outbound_pack_sessions(pick_task_id)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS IDX_outbound_packages_idempotency ON outbound_packages(idempotency_key)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_packages_session ON outbound_packages(pack_session_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_packages_pick_task ON outbound_packages(pick_task_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_packages_order_status ON outbound_packages(outbound_order_id, status)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_package_contents_package ON outbound_package_contents(package_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS IDX_outbound_package_contents_pick_task ON outbound_package_contents(pick_task_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_package_contents_pick_task');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_package_contents_package');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_packages_order_status');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_packages_pick_task');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_packages_session');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_packages_idempotency');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_pack_sessions_pick_task');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_pack_sessions_idempotency');
    await queryRunner.query('DROP TABLE IF EXISTS outbound_package_contents');
    await queryRunner.query('DROP TABLE IF EXISTS outbound_packages');
    await queryRunner.query('DROP TABLE IF EXISTS outbound_pack_sessions');
  }
}
