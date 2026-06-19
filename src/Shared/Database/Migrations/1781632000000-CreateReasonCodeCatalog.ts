import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C3: shared reason-code catalog (architecture 6.6). Consumed by audit (C4/C5),
 * approval (C6), override (C7) and exception (C9). After C2 (1781631000000).
 */
export class CreateReasonCodeCatalog1781632000000 implements MigrationInterface {
  name = 'CreateReasonCodeCatalog1781632000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reason_codes" (
        "id" char(36) NOT NULL,
        "reason_code" varchar(60) NOT NULL,
        "reason_group" varchar(60) NOT NULL,
        "description" varchar(500),
        "applies_to_actions" jsonb NOT NULL DEFAULT '[]',
        "applies_to_objects" jsonb NOT NULL DEFAULT '[]',
        "evidence_required" boolean NOT NULL DEFAULT false,
        "approval_required" boolean NOT NULL DEFAULT false,
        "allowed_role_codes" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "version" int NOT NULL DEFAULT 1,
        "effective_from" timestamptz,
        "effective_to" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_reason_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reason_codes_code" UNIQUE ("reason_code")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_reason_codes_group" ON "reason_codes" ("reason_group")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_reason_codes_group"`);
    await queryRunner.query(`DROP TABLE "reason_codes"`);
  }
}
