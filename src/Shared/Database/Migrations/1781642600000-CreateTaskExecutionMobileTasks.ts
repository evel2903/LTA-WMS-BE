import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskExecutionMobileTasks1781642600000 implements MigrationInterface {
  public name = 'CreateTaskExecutionMobileTasks1781642600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mobile_tasks" (
        "id" char(36) NOT NULL,
        "task_code" varchar(60) NOT NULL,
        "task_type" varchar(30) NOT NULL,
        "task_status" varchar(30) NOT NULL,
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(60),
        "owner_id" char(36),
        "owner_code" varchar(60),
        "source_document_type" varchar(60) NOT NULL,
        "source_document_id" char(36) NOT NULL,
        "source_document_code" varchar(100),
        "priority" integer NOT NULL,
        "assigned_user_id" char(36),
        "claimed_at" TIMESTAMP WITH TIME ZONE,
        "released_at" TIMESTAMP WITH TIME ZONE,
        "due_at" TIMESTAMP WITH TIME ZONE,
        "device_code" varchar(80),
        "session_id" varchar(120),
        "task_payload" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_by" char(36),
        CONSTRAINT "PK_mobile_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mobile_tasks_task_code" UNIQUE ("task_code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mobile_tasks_scope_status_type" ON "mobile_tasks" ("warehouse_id", "task_status", "task_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mobile_tasks_assignee_status" ON "mobile_tasks" ("assigned_user_id", "task_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_mobile_tasks_assignee_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mobile_tasks_scope_status_type"`);
    await queryRunner.query(`DROP TABLE "mobile_tasks"`);
  }
}
