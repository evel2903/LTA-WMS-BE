import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C8: control-exception catalog (CTRL-EX-01..09) + validation-rule catalog (RBAC-VAL-01..10)
 * from doc 09. Reference data: tables only — rows are seeded idempotently by code (pattern
 * C3 reason-code). No immutability trigger (re-seed is an upsert). After C7 (1781635000000).
 */
export class CreateControlAndValidationCatalogs1781636000000 implements MigrationInterface {
  name = 'CreateControlAndValidationCatalogs1781636000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "control_exception_catalog" (
        "id" char(36) NOT NULL,
        "code" varchar(40) NOT NULL,
        "scenario" varchar(500) NOT NULL,
        "category" varchar(60) NOT NULL,
        "severity" varchar(20) NOT NULL,
        "default_state" varchar(30) NOT NULL,
        "action_allowed" varchar(40) NOT NULL,
        "reason_required" boolean NOT NULL DEFAULT false,
        "evidence_required" boolean NOT NULL DEFAULT false,
        "approval_required" boolean NOT NULL DEFAULT false,
        "owner_roles" jsonb NOT NULL DEFAULT '[]',
        "implementation_status" varchar(30) NOT NULL,
        "source_doc_ref" varchar(120),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_control_exception_catalog" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_control_exception_catalog_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "validation_rule_catalog" (
        "id" char(36) NOT NULL,
        "code" varchar(40) NOT NULL,
        "description" varchar(500) NOT NULL,
        "trigger" varchar(500) NOT NULL,
        "expected_result" varchar(500) NOT NULL,
        "owner_module" varchar(60) NOT NULL,
        "control_exception_code" varchar(40),
        "implementation_status" varchar(30) NOT NULL,
        "source_doc_ref" varchar(120),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_validation_rule_catalog" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_validation_rule_catalog_code" UNIQUE ("code")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "validation_rule_catalog"`);
    await queryRunner.query(`DROP TABLE "control_exception_catalog"`);
  }
}
