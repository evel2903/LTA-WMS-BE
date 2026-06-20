import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C7: append-only override_logs (architecture 6.7) + DB-level immutability. One row per
 * successful controlled rule override (rule id, actor, target, reason, evidence, approval ref,
 * before/after, audit ref). A BEFORE UPDATE OR DELETE trigger raises, so override records cannot
 * be mutated even outside the app (AC1 "bất biến", mirroring audit_logs in 1781633000000). Indexes
 * support override-frequency queries (FR-19): by rule, actor, target and created_at. After C6
 * (1781634000000).
 */
export class CreateOverrideLogs1781635000000 implements MigrationInterface {
  name = 'CreateOverrideLogs1781635000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "override_logs" (
        "id" char(36) NOT NULL,
        "rule_id" char(36) NOT NULL,
        "rule_code" varchar(100) NOT NULL,
        "actor_user_id" char(36) NOT NULL,
        "target_object_type" varchar(60) NOT NULL,
        "target_object_id" varchar(64) NOT NULL,
        "target_object_code" varchar(100),
        "scope" jsonb,
        "control_mode" varchar(30) NOT NULL,
        "action" varchar(30) NOT NULL DEFAULT 'Override',
        "reason_code_id" char(36),
        "reason_note" varchar(1000),
        "evidence_refs" jsonb,
        "approval_request_id" char(36),
        "before_json" jsonb,
        "after_json" jsonb,
        "audit_ref" varchar(64),
        "correlation_id" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        CONSTRAINT "PK_override_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_override_logs_rule" ON "override_logs" ("rule_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_override_logs_actor" ON "override_logs" ("actor_user_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_override_logs_target" ON "override_logs" ("target_object_type", "target_object_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_override_logs_created_at" ON "override_logs" ("created_at")`);
    // Single-use approval: an APPROVED ApprovalRequest can authorize at most ONE override
    // (DB-enforced, race-safe — replay/concurrent reuse rejected with a unique violation).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_override_logs_approval_request" ON "override_logs" ("approval_request_id") WHERE "approval_request_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "prevent_override_log_update_delete"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'override_logs is append-only (% blocked)', TG_OP;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_prevent_override_log_update_delete"
      BEFORE UPDATE OR DELETE ON "override_logs"
      FOR EACH ROW EXECUTE FUNCTION "prevent_override_log_update_delete"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_prevent_override_log_update_delete" ON "override_logs"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "prevent_override_log_update_delete"()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_override_logs_approval_request"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_override_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_override_logs_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_override_logs_actor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_override_logs_rule"`);
    await queryRunner.query(`DROP TABLE "override_logs"`);
  }
}
