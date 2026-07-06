import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowManualSkuOwnership1781645200000 implements MigrationInterface {
  name = 'AllowManualSkuOwnership1781645200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "master_data_ownership_policies" (
        "id", "object_group", "display_name", "source_of_truth_type", "typical_source_systems",
        "ownership_mode", "direct_edit_allowed", "requires_audit", "requires_reason",
        "requires_source_system", "requires_reference_id", "implementation_status",
        "deferred_to_story", "policy_notes", "source_doc_ref", "created_at", "updated_at"
      ) VALUES (
        '00000000-0000-0000-0000-000000000601', 'Sku', 'SKU', 'Wms',
        '["WMS","ERP","OMS","PIM","OwnerMaster"]'::jsonb, 'WmsOwnedEditable', true, true,
        false, false, false, 'Implemented', 'FND-UXR-03A',
        'SKU master can be created and maintained directly in WMS UI when no ERP upstream is available.',
        'doc04#14', now(), now()
      )
      ON CONFLICT ("object_group") DO UPDATE
      SET
        "source_of_truth_type" = 'Wms',
        "typical_source_systems" = '["WMS","ERP","OMS","PIM","OwnerMaster"]'::jsonb,
        "ownership_mode" = 'WmsOwnedEditable',
        "direct_edit_allowed" = true,
        "requires_audit" = true,
        "requires_reason" = false,
        "requires_source_system" = false,
        "requires_reference_id" = false,
        "implementation_status" = 'Implemented',
        "deferred_to_story" = 'FND-UXR-03A',
        "policy_notes" = 'SKU master can be created and maintained directly in WMS UI when no ERP upstream is available.',
        "source_doc_ref" = 'doc04#14',
        "updated_at" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "master_data_ownership_policies"
      SET
        "source_of_truth_type" = 'ExternalSystem',
        "typical_source_systems" = '["ERP","OMS","PIM","OwnerMaster"]'::jsonb,
        "ownership_mode" = 'ExternalOwnedReadOnly',
        "direct_edit_allowed" = false,
        "requires_reason" = true,
        "requires_source_system" = true,
        "requires_reference_id" = true,
        "implementation_status" = 'PartiallyImplemented',
        "deferred_to_story" = 'C5',
        "policy_notes" = 'SKU basic attributes are external-owned; WMS operational flags are conditional.',
        "updated_at" = now()
      WHERE "object_group" = 'Sku'
    `);
  }
}
