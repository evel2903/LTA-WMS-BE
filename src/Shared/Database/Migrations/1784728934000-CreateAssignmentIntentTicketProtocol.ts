import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RH-04 (RH-ASG-01 / D3) — server-fenced assignment intent ticket protocol.
 *
 * Three tables:
 *  - user_effective_versions: durable per-user assignment-set version (BIGINT, bootstrap 0).
 *  - user_role_assignment_heads: per (user, role) head row carrying the current intent ordinal.
 *  - user_role_assignment_intents: append-only intent tickets keyed by RunId (idempotency/replay).
 *
 * user_id/role_id are FK ON DELETE RESTRICT so an intent/head can never orphan; role_id is the
 * immutable identity (canonical_role_code is denormalized evidence only). Intent history is never
 * deleted in Epic 30.
 */
export class CreateAssignmentIntentTicketProtocol1784728934000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_effective_versions" (
        "user_id" char(36) NOT NULL,
        "effective_version" bigint NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_effective_versions" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_user_effective_versions_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_user_effective_versions_nonneg" CHECK ("effective_version" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_role_assignment_heads" (
        "id" char(36) NOT NULL,
        "user_id" char(36) NOT NULL,
        "role_id" char(36) NOT NULL,
        "current_intent_version" bigint NOT NULL DEFAULT 0,
        "current_run_id" char(36),
        "status" varchar(20) NOT NULL DEFAULT 'Idle',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_role_assignment_heads" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_role_assignment_heads_item" UNIQUE ("user_id", "role_id"),
        CONSTRAINT "FK_user_role_assignment_heads_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_user_role_assignment_heads_role" FOREIGN KEY ("role_id")
          REFERENCES "roles" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_user_role_assignment_heads_version_nonneg" CHECK ("current_intent_version" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_role_assignment_intents" (
        "run_id" char(36) NOT NULL,
        "actor_user_id" char(36) NOT NULL,
        "user_id" char(36) NOT NULL,
        "role_id" char(36) NOT NULL,
        "canonical_role_code" varchar(50) NOT NULL,
        "operation" varchar(10) NOT NULL,
        "intent_version" bigint NOT NULL,
        "status" varchar(20) NOT NULL,
        "effective_version" bigint,
        "outcome" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_role_assignment_intents" PRIMARY KEY ("run_id"),
        CONSTRAINT "FK_user_role_assignment_intents_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_user_role_assignment_intents_role" FOREIGN KEY ("role_id")
          REFERENCES "roles" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_user_role_assignment_intents_operation" CHECK ("operation" IN ('assign', 'remove')),
        CONSTRAINT "CHK_user_role_assignment_intents_version_nonneg" CHECK ("intent_version" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_role_assignment_intents_item"
      ON "user_role_assignment_intents" ("user_id", "role_id")
    `);

    // AC4 cutover backfill: every EXISTING user gets an explicit EffectiveVersion 0 row. Idempotent
    // (ON CONFLICT DO NOTHING); users created after this migration are lazy-ensured to 0 on their
    // first register/apply, so the "existing user = 0" invariant holds without a later data migration.
    await queryRunner.query(`
      INSERT INTO "user_effective_versions" ("user_id", "effective_version")
      SELECT "id", 0 FROM "users"
      ON CONFLICT ("user_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_role_assignment_intents_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_role_assignment_intents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_role_assignment_heads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_effective_versions"`);
  }
}
