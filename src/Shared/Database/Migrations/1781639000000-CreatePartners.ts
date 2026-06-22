import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartners1781639000000 implements MigrationInterface {
  name = 'CreatePartners1781639000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partners" (
        "id" char(36) NOT NULL,
        "partner_code" varchar(50) NOT NULL,
        "partner_name" varchar(255) NOT NULL,
        "partner_type" varchar(30) NOT NULL,
        "status" varchar(30) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "external_reference" varchar(100) NOT NULL,
        "reference_text" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_partners" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_partners_partner_code" ON "partners" ("partner_code")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_partners_type_source_external_reference" ON "partners" ("partner_type", "source_system", "external_reference")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_partners_type_source_external_reference"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_partners_partner_code"`);
    await queryRunner.query(`DROP TABLE "partners"`);
  }
}
