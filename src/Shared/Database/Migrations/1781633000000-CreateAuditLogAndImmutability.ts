import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C4: append-only audit_logs (architecture 6.5) + DB-level immutability. A BEFORE
 * UPDATE OR DELETE trigger raises, so audit records cannot be mutated even outside the
 * app. After C3 (1781632000000).
 */
export class CreateAuditLogAndImmutability1781633000000 implements MigrationInterface {
  name = 'CreateAuditLogAndImmutability1781633000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" char(36) NOT NULL,
        "occurred_at" timestamptz NOT NULL DEFAULT now(),
        "actor_user_id" char(36),
        "actor_role_codes" jsonb NOT NULL DEFAULT '[]',
        "actor_type" varchar(20) NOT NULL,
        "action" varchar(30) NOT NULL,
        "object_type" varchar(60) NOT NULL,
        "object_id" varchar(64),
        "object_code" varchar(100),
        "before_json" jsonb,
        "after_json" jsonb,
        "reason_code_id" char(36),
        "reason_note" varchar(1000),
        "evidence_refs" jsonb,
        "reference_type" varchar(60),
        "reference_id" varchar(64),
        "warehouse_id" char(36),
        "owner_id" char(36),
        "scope_json" jsonb,
        "correlation_id" varchar(64),
        "request_id" varchar(64),
        "ip_address" varchar(64),
        "user_agent" varchar(400),
        "result" varchar(20) NOT NULL DEFAULT 'SUCCESS',
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_occurred_at" ON "audit_logs" ("occurred_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actor" ON "audit_logs" ("actor_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_object" ON "audit_logs" ("object_type", "object_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_correlation" ON "audit_logs" ("correlation_id")`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "prevent_audit_log_update_delete"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_prevent_audit_log_update_delete"
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION "prevent_audit_log_update_delete"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_prevent_audit_log_update_delete" ON "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "prevent_audit_log_update_delete"()`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
