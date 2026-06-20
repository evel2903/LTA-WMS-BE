import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C9: exception_cases — the 6-state exception lifecycle table (architecture 6.8). Unlike the
 * audit log there is NO immutability trigger (an exception case has a lifecycle and is updated
 * on each transition); the "never delete" invariant is enforced at the application layer (the
 * repository exposes no Delete — cancel/duplicate are recorded as `outcome`). After C8
 * (1781636000000).
 */
export class CreateExceptionCases1781637000000 implements MigrationInterface {
  name = 'CreateExceptionCases1781637000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exception_cases" (
        "id" char(36) NOT NULL,
        "exception_type" varchar(40) NOT NULL,
        "state" varchar(40) NOT NULL DEFAULT 'DETECTED',
        "sub_status" varchar(30),
        "outcome" varchar(30),
        "reference_type" varchar(60) NOT NULL,
        "reference_id" varchar(64) NOT NULL,
        "warehouse_id" char(36),
        "owner_id" char(36),
        "reason_code_id" char(36),
        "assigned_to_user_id" char(36),
        "assigned_role_id" char(36),
        "detected_rule_id" char(36),
        "approval_request_id" char(36),
        "severity" varchar(20) NOT NULL,
        "evidence_refs" jsonb,
        "resolution_note" varchar(1000),
        "opened_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz,
        "closed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_exception_cases" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_exception_cases_state" ON "exception_cases" ("state")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_exception_cases_exception_type" ON "exception_cases" ("exception_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exception_cases_reference" ON "exception_cases" ("reference_type", "reference_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_exception_cases_warehouse" ON "exception_cases" ("warehouse_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_exception_cases_owner" ON "exception_cases" ("owner_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_exception_cases_assigned_to" ON "exception_cases" ("assigned_to_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_assigned_to"`);
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_owner"`);
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_warehouse"`);
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_reference"`);
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_exception_type"`);
    await queryRunner.query(`DROP INDEX "IDX_exception_cases_state"`);
    await queryRunner.query(`DROP TABLE "exception_cases"`);
  }
}
