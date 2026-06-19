import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C2: data-scope runtime support. Adds the composite lookup index
 * `(principal_type, principal_id)` (deferred from C1) and a unique constraint on
 * assigned scopes. NULL `scope_value_id` (IncludeAll rows) is distinct under the
 * unique constraint, so IncludeAll idempotency relies on the seed's read-before-write.
 * The single-column `IDX_data_scopes_principal` from C1 is intentionally kept.
 */
export class AddDataScopeConstraints1781631000000 implements MigrationInterface {
  name = 'AddDataScopeConstraints1781631000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_data_scopes_principal_lookup" ON "data_scopes" ("principal_type", "principal_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_scopes" ADD CONSTRAINT "UQ_data_scopes_principal_scope" UNIQUE ("principal_type", "principal_id", "scope_type", "scope_value_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "data_scopes" DROP CONSTRAINT "UQ_data_scopes_principal_scope"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_data_scopes_principal_lookup"`);
  }
}
