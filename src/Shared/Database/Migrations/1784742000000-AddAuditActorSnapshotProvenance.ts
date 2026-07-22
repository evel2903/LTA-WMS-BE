import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditActorSnapshotProvenance1784742000000 implements MigrationInterface {
  name = 'AddAuditActorSnapshotProvenance1784742000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_snapshot_status" varchar(30) NOT NULL DEFAULT 'legacy_unverified'
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ALTER COLUMN "actor_snapshot_status" DROP DEFAULT,
      ALTER COLUMN "actor_role_codes" DROP DEFAULT,
      ALTER COLUMN "actor_role_codes" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP CONSTRAINT IF EXISTS "CHK_audit_logs_actor_snapshot_provenance",
      ADD CONSTRAINT "CHK_audit_logs_actor_snapshot_provenance" CHECK (
        "actor_snapshot_status" IN ('resolved', 'unresolved', 'legacy_unverified')
        AND (
          ("actor_snapshot_status" = 'unresolved' AND "actor_role_codes" IS NULL)
          OR
          ("actor_snapshot_status" IN ('resolved', 'legacy_unverified')
            AND "actor_role_codes" IS NOT NULL
            AND jsonb_typeof("actor_role_codes") = 'array')
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "audit_logs" WHERE "actor_role_codes" IS NULL) THEN
          RAISE EXCEPTION 'Cannot rollback actor snapshot provenance while unresolved audit rows exist';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP CONSTRAINT IF EXISTS "CHK_audit_logs_actor_snapshot_provenance"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ALTER COLUMN "actor_role_codes" SET DEFAULT '[]'::jsonb,
      ALTER COLUMN "actor_role_codes" SET NOT NULL,
      DROP COLUMN IF EXISTS "actor_snapshot_status"
    `);
  }
}
