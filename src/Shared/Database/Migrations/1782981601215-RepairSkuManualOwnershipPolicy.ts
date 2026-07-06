import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairSkuManualOwnershipPolicy1782981601215 implements MigrationInterface {
  name = 'RepairSkuManualOwnershipPolicy1782981601215';

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
        "display_name" = EXCLUDED."display_name",
        "source_of_truth_type" = EXCLUDED."source_of_truth_type",
        "typical_source_systems" = EXCLUDED."typical_source_systems",
        "ownership_mode" = EXCLUDED."ownership_mode",
        "direct_edit_allowed" = EXCLUDED."direct_edit_allowed",
        "requires_audit" = EXCLUDED."requires_audit",
        "requires_reason" = EXCLUDED."requires_reason",
        "requires_source_system" = EXCLUDED."requires_source_system",
        "requires_reference_id" = EXCLUDED."requires_reference_id",
        "implementation_status" = EXCLUDED."implementation_status",
        "deferred_to_story" = EXCLUDED."deferred_to_story",
        "policy_notes" = EXCLUDED."policy_notes",
        "source_doc_ref" = EXCLUDED."source_doc_ref",
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
        "requires_audit" = true,
        "requires_reason" = true,
        "requires_source_system" = true,
        "requires_reference_id" = true,
        "implementation_status" = 'PartiallyImplemented',
        "deferred_to_story" = 'C5',
        "policy_notes" = 'SKU basic attributes are external-owned; WMS operational flags are conditional.',
        "source_doc_ref" = 'doc04#14',
        "updated_at" = now()
      WHERE "object_group" = 'Sku'
    `);
  }
}
