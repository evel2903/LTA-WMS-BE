import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseTypes1781718000000 implements MigrationInterface {
  name = 'CreateWarehouseTypes1781718000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "warehouse_types" ("id" character(36) NOT NULL, "warehouse_type_code" character varying(50) NOT NULL, "warehouse_type_name" character varying(255) NOT NULL, "description" character varying(500), "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_warehouse_types_warehouse_type_code" UNIQUE ("warehouse_type_code"), CONSTRAINT "PK_warehouse_types_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_warehouse_types_status" ON "warehouse_types" ("status")`);
    await queryRunner.query(
      `INSERT INTO "warehouse_types" ("id", "warehouse_type_code", "warehouse_type_name", "description", "status", "source_system", "reference_id", "created_at", "updated_at") VALUES
      ('00000000-0000-0000-0000-000000000901', 'WT-01', 'Kho thường', 'Ambient/general warehouse cho hàng khô và luồng nhập-xuất tiêu chuẩn.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000902', 'WT-02', 'Kho lạnh/chuỗi lạnh', 'Cold chain warehouse cho thực phẩm, hàng đông lạnh, vaccine và kiểm soát nhiệt độ.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000903', 'WT-03', 'Kho dược/thực phẩm', 'GSP/GDP hoặc food-grade warehouse với lot, expiry, serial, truy vết và recall.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000904', 'WT-04', 'Kho hóa chất/DG', 'Dangerous goods warehouse với DG class, compatibility và chứng từ an toàn.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000905', 'WT-05', 'Kho 3PL đa chủ hàng', 'Third-party logistics warehouse với owner segregation, SLA và billing trigger.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000906', 'WT-06', 'Kho thương mại điện tử/fulfillment', 'High-volume fulfillment warehouse với each pick, packing, carrier và cutoff mạnh.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000907', 'WT-07', 'Kho sản xuất', 'Warehouse cho raw material, finished goods, production supply và line-side replenishment.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now()),
      ('00000000-0000-0000-0000-000000000908', 'WT-08', 'Kho ngoại quan/bonded', 'Bonded warehouse với customs status, bonded zone, seal/container và audit nghiêm.', 'Active', 'SYSTEM', 'Agent-Docs-01#03.01', now(), now())
      ON CONFLICT ("warehouse_type_code") DO UPDATE SET
        "warehouse_type_name" = EXCLUDED."warehouse_type_name",
        "description" = EXCLUDED."description",
        "status" = EXCLUDED."status",
        "source_system" = EXCLUDED."source_system",
        "reference_id" = EXCLUDED."reference_id",
        "updated_at" = now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_warehouse_types_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_types"`);
  }
}
