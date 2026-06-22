import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationSkeleton1781642200000 implements MigrationInterface {
  public name = 'CreateIntegrationSkeleton1781642200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration_import_batches" (
        "id" char(36) NOT NULL,
        "batch_reference" varchar(100),
        "source_system" varchar(100),
        "target_system" varchar(100),
        "status" varchar(30) NOT NULL,
        "message_count" integer NOT NULL,
        "accepted_count" integer NOT NULL,
        "duplicate_count" integer NOT NULL,
        "rejected_count" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        CONSTRAINT "PK_integration_import_batches" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "integration_interface_messages" (
        "id" char(36) NOT NULL,
        "import_batch_id" char(36),
        "message_id" varchar(120) NOT NULL,
        "message_type" varchar(100) NOT NULL,
        "version" varchar(30) NOT NULL,
        "business_reference" varchar(120) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "target_system" varchar(100) NOT NULL,
        "warehouse_context" varchar(100) NOT NULL,
        "owner_context" varchar(100),
        "event_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "correlation_id" varchar(120),
        "causation_id" varchar(120),
        "payload" jsonb NOT NULL,
        "message_status" varchar(30) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        CONSTRAINT "PK_integration_interface_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "integration_outbox_messages" (
        "id" char(36) NOT NULL,
        "source_message_id" char(36),
        "message_id" varchar(120) NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "version" varchar(30) NOT NULL,
        "business_reference" varchar(120) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "target_system" varchar(100) NOT NULL,
        "warehouse_context" varchar(100) NOT NULL,
        "owner_context" varchar(100),
        "event_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "correlation_id" varchar(120),
        "causation_id" varchar(120),
        "payload" jsonb NOT NULL,
        "status" varchar(30) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        CONSTRAINT "PK_integration_outbox_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_import_batches_source_status" ON "integration_import_batches" ("source_system", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_integration_interface_message_id" ON "integration_interface_messages" ("message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_interface_business_reference" ON "integration_interface_messages" ("business_reference", "warehouse_context", "owner_context")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_interface_batch" ON "integration_interface_messages" ("import_batch_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_integration_outbox_message_id" ON "integration_outbox_messages" ("message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_outbox_business_reference" ON "integration_outbox_messages" ("business_reference", "warehouse_context", "owner_context")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_outbox_source_status" ON "integration_outbox_messages" ("source_system", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_integration_outbox_source_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_integration_outbox_business_reference"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_integration_outbox_message_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_integration_interface_batch"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_integration_interface_business_reference"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_integration_interface_message_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_integration_import_batches_source_status"`);
    await queryRunner.query(`DROP TABLE "integration_outbox_messages"`);
    await queryRunner.query(`DROP TABLE "integration_interface_messages"`);
    await queryRunner.query(`DROP TABLE "integration_import_batches"`);
  }
}
