import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQcTasksAndResults1781643900000 implements MigrationInterface {
  public name = 'CreateQcTasksAndResults1781643900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "qc_tasks" (
        "id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "actual_quantity" numeric(18,4) NOT NULL,
        "task_status" varchar(40) NOT NULL,
        "required" boolean NOT NULL,
        "trigger_reason" varchar(80) NOT NULL,
        "trigger_policy_json" jsonb,
        "inventory_status_code" varchar(80) NOT NULL,
        "target_inventory_status_code" varchar(80),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "created_by" char(36),
        "updated_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_qc_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_qc_tasks_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_tasks_receipt_line" FOREIGN KEY ("receipt_line_id")
          REFERENCES "receipt_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_tasks_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_tasks_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_qc_tasks_receipt" ON "qc_tasks" ("receipt_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_qc_tasks_line" ON "qc_tasks" ("receipt_line_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_qc_tasks_owner_warehouse" ON "qc_tasks" ("owner_id", "warehouse_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_qc_tasks_idempotency" ON "qc_tasks" ("receipt_id", "idempotency_key")`,
    );

    await queryRunner.query(`
      CREATE TABLE "qc_results" (
        "id" char(36) NOT NULL,
        "qc_task_id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "result_status" varchar(40) NOT NULL,
        "disposition_code" varchar(40) NOT NULL,
        "inspected_quantity" numeric(18,4) NOT NULL,
        "accepted_quantity" numeric(18,4) NOT NULL,
        "rejected_quantity" numeric(18,4) NOT NULL,
        "accepted_inventory_status_code" varchar(80),
        "rejected_inventory_status_code" varchar(80),
        "target_inventory_status_code" varchar(80) NOT NULL,
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "evidence_json" jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "recorded_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_qc_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_qc_results_task" FOREIGN KEY ("qc_task_id")
          REFERENCES "qc_tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_results_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_results_receipt_line" FOREIGN KEY ("receipt_line_id")
          REFERENCES "receipt_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_results_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qc_results_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_qc_results_task" ON "qc_results" ("qc_task_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_qc_results_receipt" ON "qc_results" ("receipt_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_qc_results_line" ON "qc_results" ("receipt_line_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_qc_results_owner_warehouse" ON "qc_results" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_qc_results_idempotency" ON "qc_results" ("qc_task_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_qc_results_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_results_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_results_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_results_receipt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_results_task"`);
    await queryRunner.query(`DROP TABLE "qc_results"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_qc_tasks_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_tasks_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_tasks_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_qc_tasks_receipt"`);
    await queryRunner.query(`DROP TABLE "qc_tasks"`);
  }
}
