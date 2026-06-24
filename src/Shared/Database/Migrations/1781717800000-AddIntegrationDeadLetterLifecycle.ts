import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntegrationDeadLetterLifecycle1781717800000 implements MigrationInterface {
  public name = 'AddIntegrationDeadLetterLifecycle1781717800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration_outbox_messages"
        ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "last_error" text,
        ADD COLUMN IF NOT EXISTS "failure_category" varchar(40),
        ADD COLUMN IF NOT EXISTS "dead_letter_reason" text,
        ADD COLUMN IF NOT EXISTS "dead_lettered_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "resolution_action" varchar(40),
        ADD COLUMN IF NOT EXISTS "action_idempotency_key" varchar(120),
        ADD COLUMN IF NOT EXISTS "action_payload_hash" varchar(128),
        ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "resolved_by" char(36),
        ADD COLUMN IF NOT EXISTS "reason_code" varchar(80),
        ADD COLUMN IF NOT EXISTS "reason_code_id" char(36),
        ADD COLUMN IF NOT EXISTS "reason_note" varchar(500),
        ADD COLUMN IF NOT EXISTS "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_integration_outbox_dead_letter" ON "integration_outbox_messages" ("status", "failure_category", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_integration_outbox_event_type" ON "integration_outbox_messages" ("event_type", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_integration_outbox_event_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_integration_outbox_dead_letter"`);
    await queryRunner.query(`
      ALTER TABLE "integration_outbox_messages"
        DROP COLUMN IF EXISTS "updated_at",
        DROP COLUMN IF EXISTS "evidence_refs",
        DROP COLUMN IF EXISTS "reason_note",
        DROP COLUMN IF EXISTS "reason_code_id",
        DROP COLUMN IF EXISTS "reason_code",
        DROP COLUMN IF EXISTS "resolved_by",
        DROP COLUMN IF EXISTS "resolved_at",
        DROP COLUMN IF EXISTS "action_payload_hash",
        DROP COLUMN IF EXISTS "action_idempotency_key",
        DROP COLUMN IF EXISTS "resolution_action",
        DROP COLUMN IF EXISTS "dead_lettered_at",
        DROP COLUMN IF EXISTS "dead_letter_reason",
        DROP COLUMN IF EXISTS "failure_category",
        DROP COLUMN IF EXISTS "last_error",
        DROP COLUMN IF EXISTS "next_retry_at",
        DROP COLUMN IF EXISTS "max_attempts",
        DROP COLUMN IF EXISTS "attempt_count"
    `);
  }
}
