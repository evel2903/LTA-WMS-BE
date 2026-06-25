import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskExecutionMobileScanEvents1781642700000 implements MigrationInterface {
  public name = 'CreateTaskExecutionMobileScanEvents1781642700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_scan_events" (
        "id" char(36) NOT NULL,
        "task_id" char(36) NOT NULL,
        "task_code" varchar(60) NOT NULL,
        "warehouse_id" char(36) NOT NULL,
        "owner_id" char(36),
        "scan_type" varchar(30) NOT NULL,
        "raw_value" varchar(240) NOT NULL,
        "normalized_value" varchar(240),
        "result" varchar(40) NOT NULL,
        "resolved_object_type" varchar(60),
        "resolved_object_id" char(36),
        "parsed_value_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "rejection_code" varchar(80),
        "rejection_message" varchar(255),
        "reason_code" varchar(64),
        "device_code" varchar(80),
        "session_id" varchar(120),
        "actor_user_id" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_mobile_scan_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mobile_scan_events_task_id_mobile_tasks_id" FOREIGN KEY ("task_id") REFERENCES "mobile_tasks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mobile_scan_events_task_time" ON "mobile_scan_events" ("task_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mobile_scan_events_raw_value" ON "mobile_scan_events" ("raw_value")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_scan_events_raw_value"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_scan_events_task_time"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_scan_events"`);
  }
}
