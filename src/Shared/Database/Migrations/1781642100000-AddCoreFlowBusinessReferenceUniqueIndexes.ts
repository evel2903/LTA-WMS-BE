import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoreFlowBusinessReferenceUniqueIndexes1781642100000 implements MigrationInterface {
  public name = 'AddCoreFlowBusinessReferenceUniqueIndexes1781642100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_core_flow_business_reference"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_core_flow_business_reference_owner" ON "core_flow_instances" ("business_reference", "warehouse_code", "owner_code") WHERE "owner_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_core_flow_business_reference_no_owner" ON "core_flow_instances" ("business_reference", "warehouse_code") WHERE "owner_code" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_core_flow_business_reference_no_owner"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_core_flow_business_reference_owner"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_core_flow_business_reference" ON "core_flow_instances" ("business_reference", "warehouse_code", "owner_code")`,
    );
  }
}
