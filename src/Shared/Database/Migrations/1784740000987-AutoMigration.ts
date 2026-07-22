import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RH-05 durable role-catalog version and safe role-deletion baseline.
 *
 * Generated from the RH-05 entity diff, then scope-reviewed to remove unrelated pre-existing
 * TypeORM schema drift. The down path intentionally does NOT restore ON DELETE CASCADE: a
 * rollback may remove the unused catalog proof table, but must never silently make assigned
 * role deletion destructive again.
 */
export class AutoMigration1784740000987 implements MigrationInterface {
  public readonly name = 'AutoMigration1784740000987';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_catalog_versions" (
        "id" smallint NOT NULL,
        "version" bigint NOT NULL,
        CONSTRAINT "CHK_role_catalog_versions_singleton" CHECK ("id" = 1),
        CONSTRAINT "CHK_role_catalog_versions_nonnegative" CHECK ("version" >= 0),
        CONSTRAINT "PK_role_catalog_versions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "role_catalog_versions"
        ALTER COLUMN "id" TYPE smallint USING "id"::smallint,
        ALTER COLUMN "id" SET NOT NULL,
        ALTER COLUMN "version" TYPE bigint USING "version"::bigint,
        ALTER COLUMN "version" SET NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO "role_catalog_versions" ("id", "version")
      SELECT 1, 0
      WHERE NOT EXISTS (SELECT 1 FROM "role_catalog_versions" WHERE "id" = 1)
    `);
    await queryRunner.query(`
      ALTER TABLE "role_catalog_versions"
        DROP CONSTRAINT IF EXISTS "CHK_role_catalog_versions_singleton",
        DROP CONSTRAINT IF EXISTS "CHK_role_catalog_versions_nonnegative",
        DROP CONSTRAINT IF EXISTS "PK_role_catalog_versions"
    `);
    await queryRunner.query(`
      ALTER TABLE "role_catalog_versions"
        ADD CONSTRAINT "CHK_role_catalog_versions_singleton" CHECK ("id" = 1),
        ADD CONSTRAINT "CHK_role_catalog_versions_nonnegative" CHECK ("version" >= 0),
        ADD CONSTRAINT "PK_role_catalog_versions" PRIMARY KEY ("id")
    `);

    await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_user_roles_role_id_roles_id"`);
    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_role_id_roles_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "exception_cases"
      DROP CONSTRAINT IF EXISTS "FK_exception_cases_assigned_role_id_roles_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "exception_cases"
      ADD CONSTRAINT "FK_exception_cases_assigned_role_id_roles_id"
      FOREIGN KEY ("assigned_role_id") REFERENCES "roles"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    const orphanScopes = (await queryRunner.query(`
      SELECT 1
        FROM "data_scopes" scope
        LEFT JOIN "roles" role ON role."id" = scope."principal_id"
       WHERE scope."principal_type" = 'ROLE' AND role."id" IS NULL
       LIMIT 1
    `)) as unknown[];
    if (Array.isArray(orphanScopes) && orphanScopes.length > 0) {
      throw new Error('Cannot install role data-scope guard while orphan role principals exist');
    }
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "enforce_data_scope_role_reference"()
      RETURNS trigger AS $$
      BEGIN
        IF NEW."principal_type" = 'ROLE' THEN
          PERFORM 1 FROM "roles" WHERE "id" = NEW."principal_id" FOR KEY SHARE;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Role principal does not exist'
              USING ERRCODE = '23503', CONSTRAINT = 'FK_data_scopes_role_principal';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "TRG_data_scopes_role_reference" ON "data_scopes"`);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_data_scopes_role_reference"
      BEFORE INSERT OR UPDATE OF "principal_type", "principal_id" ON "data_scopes"
      FOR EACH ROW EXECUTE FUNCTION "enforce_data_scope_role_reference"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "TRG_data_scopes_role_reference" ON "data_scopes"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "enforce_data_scope_role_reference"()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_catalog_versions"`);
  }
}
