import { MigrationInterface, QueryRunner } from 'typeorm';

// Migration này có chủ đích chạy trước AllowManualInboundReceipts1784400000000.
// Với DB nâng cấp mới, nó giữ tên index lịch sử bằng predicate chỉ cho manual,
// để IF NOT EXISTS ở migration sau không áp invariant mới lên release Plan cũ.
// Với DB đã nâng cấp, nó thay index global bằng cùng invariant chỉ cho manual.
export class ScopeManualPutawayReleaseUniqueness1784399999000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_putaway_releases_receipt_line"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_putaway_releases_receipt_line"
      ON "inbound_putaway_releases" ("receipt_line_id")
      WHERE "inbound_plan_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_putaway_releases_receipt_line"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_putaway_releases_receipt_line"
      ON "inbound_putaway_releases" ("receipt_line_id")
    `);
  }
}
