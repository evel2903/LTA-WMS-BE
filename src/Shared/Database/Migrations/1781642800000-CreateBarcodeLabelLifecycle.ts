import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBarcodeLabelLifecycle1781642800000 implements MigrationInterface {
  public name = 'CreateBarcodeLabelLifecycle1781642800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "label_templates" (
        "id" char(36) NOT NULL,
        "template_code" varchar(80) NOT NULL,
        "template_name" varchar(160) NOT NULL,
        "label_type" varchar(50) NOT NULL,
        "status" varchar(30) NOT NULL,
        "required_fields" jsonb NOT NULL,
        "template_body" text NOT NULL,
        "active_version_id" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_label_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_label_templates_template_code" UNIQUE ("template_code")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "label_template_versions" (
        "id" char(36) NOT NULL,
        "template_id" char(36) NOT NULL,
        "version_no" integer NOT NULL,
        "template_body" text NOT NULL,
        "required_fields" jsonb NOT NULL,
        "status" varchar(30) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" char(36),
        CONSTRAINT "PK_label_template_versions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_label_template_versions_template_version" UNIQUE ("template_id", "version_no"),
        CONSTRAINT "FK_label_template_versions_template" FOREIGN KEY ("template_id")
          REFERENCES "label_templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "print_jobs" (
        "id" char(36) NOT NULL,
        "job_code" varchar(80) NOT NULL,
        "template_id" char(36) NOT NULL,
        "template_version_id" char(36) NOT NULL,
        "business_object_type" varchar(80) NOT NULL,
        "business_object_id" varchar(120) NOT NULL,
        "business_object_code" varchar(120),
        "warehouse_id" char(36),
        "owner_id" char(36),
        "payload_json" jsonb NOT NULL,
        "preview_content" text,
        "status" varchar(30) NOT NULL,
        "validation_errors" jsonb,
        "reprint_count" integer NOT NULL DEFAULT 0,
        "requested_by" char(36),
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_print_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_print_jobs_job_code" UNIQUE ("job_code"),
        CONSTRAINT "FK_print_jobs_template" FOREIGN KEY ("template_id")
          REFERENCES "label_templates"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_print_jobs_template_version" FOREIGN KEY ("template_version_id")
          REFERENCES "label_template_versions"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reprint_requests" (
        "id" char(36) NOT NULL,
        "original_print_job_id" char(36) NOT NULL,
        "reprint_sequence" integer NOT NULL,
        "reason_code" varchar(80) NOT NULL,
        "reason_code_id" char(36),
        "reason_note" varchar(500),
        "evidence_refs" jsonb,
        "status" varchar(30) NOT NULL,
        "requested_by" char(36),
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_reprint_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reprint_requests_print_job_sequence" UNIQUE ("original_print_job_id", "reprint_sequence"),
        CONSTRAINT "FK_reprint_requests_print_job" FOREIGN KEY ("original_print_job_id")
          REFERENCES "print_jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_label_templates_type_status" ON "label_templates" ("label_type", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_label_template_versions_template_status" ON "label_template_versions" ("template_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_print_jobs_template_status" ON "print_jobs" ("template_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_print_jobs_business_object" ON "print_jobs" ("business_object_type", "business_object_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_print_jobs_scope_status" ON "print_jobs" ("warehouse_id", "owner_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_print_jobs_scope_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_print_jobs_business_object"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_print_jobs_template_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_label_template_versions_template_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_label_templates_type_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reprint_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "print_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "label_template_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "label_templates"`);
  }
}
