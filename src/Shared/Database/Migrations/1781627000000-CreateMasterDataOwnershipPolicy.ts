import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMasterDataOwnershipPolicy1781627000000 implements MigrationInterface {
  name = 'CreateMasterDataOwnershipPolicy1781627000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "master_data_ownership_policies" ("id" character(36) NOT NULL, "object_group" character varying(80) NOT NULL, "display_name" character varying(150) NOT NULL, "source_of_truth_type" character varying(60) NOT NULL, "typical_source_systems" jsonb NOT NULL, "ownership_mode" character varying(80) NOT NULL, "direct_edit_allowed" boolean NOT NULL DEFAULT false, "requires_audit" boolean NOT NULL DEFAULT true, "requires_reason" boolean NOT NULL DEFAULT false, "requires_source_system" boolean NOT NULL DEFAULT false, "requires_reference_id" boolean NOT NULL DEFAULT false, "implementation_status" character varying(60) NOT NULL, "deferred_to_story" character varying(50), "policy_notes" text NOT NULL, "source_doc_ref" character varying(80) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_master_data_ownership_policies_object_group" UNIQUE ("object_group"), CONSTRAINT "PK_master_data_ownership_policies_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `INSERT INTO "master_data_ownership_policies" ("id", "object_group", "display_name", "source_of_truth_type", "typical_source_systems", "ownership_mode", "direct_edit_allowed", "requires_audit", "requires_reason", "requires_source_system", "requires_reference_id", "implementation_status", "deferred_to_story", "policy_notes", "source_doc_ref", "created_at", "updated_at") VALUES
      ('00000000-0000-0000-0000-000000000601', 'Sku', 'SKU', 'ExternalSystem', '["ERP","OMS","PIM","OwnerMaster"]'::jsonb, 'ExternalOwnedReadOnly', false, true, true, true, true, 'PartiallyImplemented', 'C5', 'SKU basic attributes are external-owned; WMS operational flags are conditional.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000602', 'UomPack', 'UOM/Pack', 'Hybrid', '["ERP","OwnerMaster","WMS"]'::jsonb, 'ExternalImportedConditionalEdit', true, true, true, true, true, 'Implemented', 'C5', 'UOM and pack corrections can affect inventory and require audit enforcement in C5.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000603', 'BarcodeAlias', 'Barcode/Alias', 'Hybrid', '["ERP","OwnerMaster","Supplier","WMS"]'::jsonb, 'ExternalImportedConditionalEdit', true, true, true, true, true, 'Implemented', 'C5', 'Barcode alias is editable with duplicate control and later audit enforcement.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000604', 'WarehouseLocation', 'Warehouse/Location', 'Wms', '["WMS"]'::jsonb, 'WmsOwnedEditable', true, true, true, false, false, 'Implemented', 'C5', 'Warehouse and location are WMS-owned but cannot be silently deleted once used.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000605', 'LocationProfile', 'Location Profile', 'Wms', '["WMS"]'::jsonb, 'WmsOwnedControlled', true, true, true, false, false, 'Implemented', 'C5', 'Location profile changes affect rules and require version/audit enforcement.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000606', 'OwnerCustomerSupplier', 'Owner/Customer/Supplier', 'ExternalSystem', '["ERP","CRM","OMS","OwnerOnboarding"]'::jsonb, 'ExternalOwnedReadOnly', false, true, true, true, true, 'PartiallyImplemented', 'C5', 'Party master data is external-owned or conditional through onboarding.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000607', 'InventoryStatus', 'Inventory Status', 'Wms', '["WMS"]'::jsonb, 'WmsOwnedControlled', true, true, true, false, false, 'Implemented', 'C5', 'Inventory status is core WMS configuration and must be change-controlled.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000608', 'LpnSscc', 'LPN/SSCC', 'Deferred', '["WMS","ExternalSystem"]'::jsonb, 'Deferred', false, true, true, true, true, 'Deferred', 'V1+', 'A5 only stores optional LpnCode dimension; full LPN/SSCC lifecycle is deferred.', 'doc04#14', now(), now()),
      ('00000000-0000-0000-0000-000000000609', 'ReasonCode', 'Reason Code', 'Wms', '["WMS"]'::jsonb, 'Deferred', false, true, false, false, false, 'Deferred', 'C3', 'Reason code catalog is completed by C3.', 'doc04#14', now(), now())`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "master_data_ownership_policies"`);
  }
}
