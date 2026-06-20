import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C6: approval_requests (architecture 6.7). A plain business table with a simple
 * lifecycle (PENDING -> APPROVED | REJECTED) — NO immutability trigger (audit_logs
 * owns immutability; approval requests have a mutable decision). After C4
 * (1781633000000). jsonb scope/evidence; indexes on decision, requester and target.
 */
export class CreateApprovalRequests1781634000000 implements MigrationInterface {
  name = 'CreateApprovalRequests1781634000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "approval_requests" (
        "id" char(36) NOT NULL,
        "requester_user_id" char(36) NOT NULL,
        "action" varchar(30) NOT NULL,
        "target_object_type" varchar(60) NOT NULL,
        "target_object_id" varchar(64) NOT NULL,
        "target_object_code" varchar(100),
        "scope" jsonb,
        "request_reason_code_id" char(36),
        "request_reason_note" varchar(1000),
        "evidence_refs" jsonb,
        "decision" varchar(20) NOT NULL DEFAULT 'PENDING',
        "decided_by_user_id" char(36),
        "decision_reason_code_id" char(36),
        "decision_note" varchar(1000),
        "decided_at" timestamptz,
        "reference_type" varchar(60),
        "reference_id" varchar(64),
        "correlation_id" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_approval_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_approval_requests_decision" ON "approval_requests" ("decision")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_requests_requester" ON "approval_requests" ("requester_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_requests_target" ON "approval_requests" ("target_object_type", "target_object_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_requests_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_requests_requester"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_requests_decision"`);
    await queryRunner.query(`DROP TABLE "approval_requests"`);
  }
}
