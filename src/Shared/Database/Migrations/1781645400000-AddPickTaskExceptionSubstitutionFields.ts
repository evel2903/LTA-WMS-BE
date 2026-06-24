import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPickTaskExceptionSubstitutionFields1781645400000 implements MigrationInterface {
  name = 'AddPickTaskExceptionSubstitutionFields1781645400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outbound_pick_tasks
        ADD COLUMN IF NOT EXISTS exception_type varchar(40),
        ADD COLUMN IF NOT EXISTS exception_case_id char(36),
        ADD COLUMN IF NOT EXISTS exception_reason_code varchar(80),
        ADD COLUMN IF NOT EXISTS exception_reason_code_id char(36),
        ADD COLUMN IF NOT EXISTS exception_reason_note text,
        ADD COLUMN IF NOT EXISTS exception_evidence_json jsonb,
        ADD COLUMN IF NOT EXISTS exception_idempotency_key varchar(180),
        ADD COLUMN IF NOT EXISTS exception_payload_fingerprint varchar(64),
        ADD COLUMN IF NOT EXISTS exception_reported_at timestamptz,
        ADD COLUMN IF NOT EXISTS exception_reported_by char(36),
        ADD COLUMN IF NOT EXISTS replenishment_required boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS replenishment_task_id char(36),
        ADD COLUMN IF NOT EXISTS substitution_status varchar(40),
        ADD COLUMN IF NOT EXISTS substitution_sku_id char(36),
        ADD COLUMN IF NOT EXISTS substitution_sku_code varchar(80),
        ADD COLUMN IF NOT EXISTS substitution_uom_id char(36),
        ADD COLUMN IF NOT EXISTS substitution_uom_code varchar(40),
        ADD COLUMN IF NOT EXISTS substitution_quantity numeric(18,4),
        ADD COLUMN IF NOT EXISTS substitution_approval_request_id char(36),
        ADD COLUMN IF NOT EXISTS substitution_policy_json jsonb,
        ADD COLUMN IF NOT EXISTS substitution_idempotency_key varchar(180),
        ADD COLUMN IF NOT EXISTS substitution_payload_fingerprint varchar(64),
        ADD COLUMN IF NOT EXISTS substitution_requested_at timestamptz,
        ADD COLUMN IF NOT EXISTS substitution_requested_by char(36)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_outbound_pick_tasks_exception_case
        ON outbound_pick_tasks(exception_case_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_outbound_pick_tasks_replenishment_task
        ON outbound_pick_tasks(replenishment_task_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_pick_tasks_replenishment_task');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_outbound_pick_tasks_exception_case');
    await queryRunner.query(`
      ALTER TABLE outbound_pick_tasks
        DROP COLUMN IF EXISTS substitution_requested_by,
        DROP COLUMN IF EXISTS substitution_requested_at,
        DROP COLUMN IF EXISTS substitution_payload_fingerprint,
        DROP COLUMN IF EXISTS substitution_idempotency_key,
        DROP COLUMN IF EXISTS substitution_policy_json,
        DROP COLUMN IF EXISTS substitution_approval_request_id,
        DROP COLUMN IF EXISTS substitution_quantity,
        DROP COLUMN IF EXISTS substitution_uom_code,
        DROP COLUMN IF EXISTS substitution_uom_id,
        DROP COLUMN IF EXISTS substitution_sku_code,
        DROP COLUMN IF EXISTS substitution_sku_id,
        DROP COLUMN IF EXISTS substitution_status,
        DROP COLUMN IF EXISTS replenishment_task_id,
        DROP COLUMN IF EXISTS replenishment_required,
        DROP COLUMN IF EXISTS exception_reported_by,
        DROP COLUMN IF EXISTS exception_reported_at,
        DROP COLUMN IF EXISTS exception_payload_fingerprint,
        DROP COLUMN IF EXISTS exception_idempotency_key,
        DROP COLUMN IF EXISTS exception_evidence_json,
        DROP COLUMN IF EXISTS exception_reason_note,
        DROP COLUMN IF EXISTS exception_reason_code_id,
        DROP COLUMN IF EXISTS exception_reason_code,
        DROP COLUMN IF EXISTS exception_case_id,
        DROP COLUMN IF EXISTS exception_type
    `);
  }
}
