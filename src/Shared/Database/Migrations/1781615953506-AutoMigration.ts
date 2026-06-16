import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1781615953506 implements MigrationInterface {
  name = 'AutoMigration1781615953506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" character(36) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "email_address" character varying(255) NOT NULL, "password_hash" character varying(255), "role" character varying(50) NOT NULL DEFAULT 'User', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d1a16364b1f276e14e8e4cfc47" ON "users"  ("email_address") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_d1a16364b1f276e14e8e4cfc47"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
