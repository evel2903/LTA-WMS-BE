import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreFlow1781642000000 implements MigrationInterface {
  public name = 'CreateCoreFlow1781642000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "core_flow_instances" (
        "id" char(36) NOT NULL,
        "business_reference" varchar(100) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "warehouse_code" varchar(100) NOT NULL,
        "owner_code" varchar(100),
        "correlation_id" varchar(100) NOT NULL,
        "current_stage" varchar(30) NOT NULL,
        "status" varchar(30) NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_core_flow_instances" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_milestones" (
        "id" char(36) NOT NULL,
        "core_flow_instance_id" char(36) NOT NULL,
        "stage_code" varchar(30) NOT NULL,
        "step_code" varchar(60) NOT NULL,
        "milestone_status" varchar(30) NOT NULL,
        "inventory_status_code" varchar(60),
        "reason_code_id" char(36),
        "reason_note" varchar(500),
        "exception_case_id" char(36),
        "metadata" jsonb,
        "occurred_at" timestamptz NOT NULL,
        "created_by" char(36),
        CONSTRAINT "PK_workflow_milestones" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_milestones_core_flow_instance" FOREIGN KEY ("core_flow_instance_id")
          REFERENCES "core_flow_instances"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_handoffs" (
        "id" char(36) NOT NULL,
        "core_flow_instance_id" char(36) NOT NULL,
        "from_stage" varchar(30) NOT NULL,
        "to_stage" varchar(30) NOT NULL,
        "handoff_status" varchar(30) NOT NULL,
        "blocked_reason" varchar(500),
        "reason_code_id" char(36),
        "reason_note" varchar(500),
        "metadata" jsonb,
        "occurred_at" timestamptz NOT NULL,
        "created_by" char(36),
        CONSTRAINT "PK_workflow_handoffs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_handoffs_core_flow_instance" FOREIGN KEY ("core_flow_instance_id")
          REFERENCES "core_flow_instances"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_core_flow_business_reference" ON "core_flow_instances" ("business_reference", "warehouse_code", "owner_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_milestones_instance_step" ON "workflow_milestones" ("core_flow_instance_id", "step_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_handoffs_instance" ON "workflow_handoffs" ("core_flow_instance_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_workflow_handoffs_instance"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_workflow_milestones_instance_step"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_core_flow_business_reference"`);
    await queryRunner.query(`DROP TABLE "workflow_handoffs"`);
    await queryRunner.query(`DROP TABLE "workflow_milestones"`);
    await queryRunner.query(`DROP TABLE "core_flow_instances"`);
  }
}
