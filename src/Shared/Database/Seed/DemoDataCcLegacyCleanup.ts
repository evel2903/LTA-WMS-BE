import type { EntityManager } from 'typeorm';
import { GetEnv } from '@shared/Config/Env/Env';
import { AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows } from '@shared/Database/Seed/DemoDataCcScreenCoverageSeed';
import { AssertDemoDataCcLocalConnectionTarget } from '@shared/Database/Seed/DemoDataCcTargetGuard';

const LegacyDemoSourceSystem = 'DEMO-DATA-CC';
const LegacyDemoFlowReferences = ['CC-DEMO-WT01', 'CC-DEMO-WT05', 'CC-DEMO-WT06'] as const;
const LegacyDemoCorrelationId = 'DEMO-DATA-CC-SCREEN-COVERAGE';
const LegacyDemoScreenTemplateCodes = ['LBL-CC-SCREEN-DEMO-LPN'] as const;
const LegacyDemoScreenPrintJobCodes = ['PJ-CC-SCREEN-DEMO-WT01-LPN'] as const;
const LegacyDemoScreenMobileTaskCodes = ['MT-CC-SCREEN-DEMO-PICK-WT01'] as const;
const LegacyDemoScreenReplenishmentTaskCodes = ['RP-CC-SCREEN-DEMO-PF-A01'] as const;
const LegacyDemoScreenCycleCountCodes = ['CCW-CC-SCREEN-DEMO-RSV-A01'] as const;
const LegacyDemoScreenExceptionReferenceIds = ['CC-SCREEN-DEMO-CYCLE-VARIANCE'] as const;
const LegacyDemoSiteCodes = ['CC-SOUTH', 'CC-HCM'] as const;
const LegacyDemoWarehouseCodes = ['CC-HCM-01'] as const;
const LegacyDemoOwnerCodes = ['CCVN'] as const;
const LegacyDemoPartnerCodes = ['CC-SUP-HCM', 'CC-CUS-MT', 'CC-CAR-3PL'] as const;
const LegacyDemoWarehouseProfileCodes = ['WP-CC-HCM-DEMO'] as const;
const LegacyDemoLocationProfileCodes = [
  'LP-CC-DOCK',
  'LP-CC-QC',
  'LP-CC-AISLE',
  'LP-CC-RACK',
  'LP-CC-LEVEL',
  'LP-CC-RESERVE',
  'LP-CC-PICKFACE',
  'LP-CC-PACK',
  'LP-CC-QUARANTINE',
] as const;
const LegacyDemoZoneCodes = ['CC-RCV', 'CC-QC', 'CC-RSV', 'CC-PF', 'CC-PACK', 'CC-LOAD', 'CC-QAR'] as const;
const LegacyDemoLocationCodes = [
  'RCV-A01',
  'RCV-A01-D01',
  'RCV-A01-D02',
  'QC-A01',
  'QC-A01-STG01',
  'QC-A01-HOLD01',
  'RSV-A01',
  'RSV-A01-R01',
  'RSV-A01-R01-L01',
  'RSV-A01-R01-L01-B01',
  'RSV-A01-R01-L01-B02',
  'RSV-A01-R02',
  'RSV-A01-R02-L01',
  'RSV-A01-R02-L01-B01',
  'PF-A01',
  'PF-A01-R01',
  'PF-A01-R01-L01',
  'PF-A01-R01-L01-B01',
  'PF-A01-R01-L01-B02',
  'PACK-A01',
  'PACK-A01-ST01',
  'PACK-A01-ST02',
  'LOAD-A01',
  'LOAD-A01-D01',
  'LOAD-A01-D02',
  'QAR-A01',
  'QAR-A01-HOLD01',
] as const;
const LegacyDemoSkuCodes = ['CC-COKE-330-CAN', 'CC-COKE-390-BTL', 'CC-SPRITE-330-CAN', 'CC-FANTA-330-CAN'] as const;
const LegacyDemoUomCodes = ['CAN', 'BOTTLE', 'CASE', 'PALLET'] as const;
const LegacyDemoInventoryLpnCodes = [
  'CC-LPN-0001',
  'CC-LPN-0002',
  'CC-LPN-0003',
  'CC-LPN-0004',
  'CC-LPN-0005',
  'CC-LPN-0006',
  'CC-LPN-0007',
] as const;
const LegacyDemoFlowLpnCodes = ['CC-FLOW-LPN-WT01', 'CC-FLOW-LPN-WT05', 'CC-FLOW-LPN-WT06'] as const;
const LegacyDemoInventoryStatusCodes = [
  'AVAILABLE',
  'ALLOCATED',
  'PICKED',
  'PACKED',
  'STAGED',
  'LOADED',
  'PENDING_QC',
  'QC_PASSED',
  'QC_FAILED',
  'HOLD',
  'DAMAGED',
  'EXPIRED',
  'QUARANTINE',
  'RETURNED',
  'IN_TRANSIT',
  'ADJUSTMENT_PENDING',
  'CYCLE_COUNT_LOCKED',
] as const;

const AssertLegacyCleanupLocalTarget = (manager: EntityManager): void => {
  AssertDemoDataCcLocalConnectionTarget(manager.connection.options, GetEnv(), 'EntityManager.connection.options');
};

export const CleanupLegacyDemoDataCcRows = async (manager: EntityManager): Promise<void> => {
  AssertLegacyCleanupLocalTarget(manager);
  await CleanupLegacyDemoDataCcScreenRowsUnsafe(manager);
  await CleanupLegacyDemoDataCcFlowRowsUnsafe(manager);
  await CleanupLegacyDemoDataCcMasterRowsUnsafe(manager);
};

export const CleanupLegacyDemoDataCcScreenRows = async (manager: EntityManager): Promise<void> => {
  AssertLegacyCleanupLocalTarget(manager);
  await CleanupLegacyDemoDataCcScreenRowsUnsafe(manager);
};

export const CleanupLegacyDemoDataCcFlowRows = async (manager: EntityManager): Promise<void> => {
  AssertLegacyCleanupLocalTarget(manager);
  await CleanupLegacyDemoDataCcFlowRowsUnsafe(manager);
};

export const CleanupLegacyDemoDataCcMasterRows = async (manager: EntityManager): Promise<void> => {
  AssertLegacyCleanupLocalTarget(manager);
  await CleanupLegacyDemoDataCcMasterRowsUnsafe(manager);
};

const CleanupLegacyDemoDataCcScreenRowsUnsafe = async (manager: EntityManager): Promise<void> => {
  await AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows(manager);
  await manager.query(
    `DELETE FROM reprint_requests WHERE original_print_job_id IN (SELECT id FROM print_jobs WHERE job_code = ANY($1::text[]))`,
    [LegacyDemoScreenPrintJobCodes],
  );
  await manager.query(`DELETE FROM print_jobs WHERE job_code = ANY($1::text[])`, [LegacyDemoScreenPrintJobCodes]);
  await manager.query(
    `DELETE FROM label_template_versions WHERE template_id IN (SELECT id FROM label_templates WHERE template_code = ANY($1::text[]))`,
    [LegacyDemoScreenTemplateCodes],
  );
  await manager.query(`DELETE FROM label_templates WHERE template_code = ANY($1::text[])`, [
    LegacyDemoScreenTemplateCodes,
  ]);
  await manager.query(
    `DELETE FROM mobile_scan_events WHERE task_id IN (SELECT id FROM mobile_tasks WHERE task_code = ANY($1::text[]))`,
    [LegacyDemoScreenMobileTaskCodes],
  );
  await manager.query(`DELETE FROM mobile_tasks WHERE task_code = ANY($1::text[])`, [LegacyDemoScreenMobileTaskCodes]);
  await manager.query(`DELETE FROM replenishment_tasks WHERE task_code = ANY($1::text[])`, [
    LegacyDemoScreenReplenishmentTaskCodes,
  ]);
  await manager.query(`DELETE FROM cycle_count_works WHERE count_code = ANY($1::text[])`, [
    LegacyDemoScreenCycleCountCodes,
  ]);
  await manager.query(`DELETE FROM exception_cases WHERE reference_id = ANY($1::text[])`, [
    LegacyDemoScreenExceptionReferenceIds,
  ]);
  await manager.query(`DELETE FROM approval_requests WHERE correlation_id = $1`, [LegacyDemoCorrelationId]);
  await AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows(manager);
};

const CleanupLegacyDemoDataCcFlowRowsUnsafe = async (manager: EntityManager): Promise<void> => {
  const codes = BuildLegacyDemoDataCcFlowCleanupCodes();
  await manager.query(
    `DELETE FROM integration_reconciliation_items WHERE run_id IN (SELECT id FROM integration_reconciliation_runs WHERE business_reference = ANY($1::text[]) AND idempotency_key = ANY($2::text[]) AND evidence_refs ?| $3::text[])`,
    [LegacyDemoFlowReferences, codes.ReconciliationIdempotencyKeys, codes.ReconciliationEvidenceRefs],
  );
  await manager.query(
    `DELETE FROM integration_reconciliation_runs WHERE business_reference = ANY($1::text[]) AND idempotency_key = ANY($2::text[]) AND evidence_refs ?| $3::text[]`,
    [LegacyDemoFlowReferences, codes.ReconciliationIdempotencyKeys, codes.ReconciliationEvidenceRefs],
  );
  await manager.query(
    `DELETE FROM integration_outbox_messages WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [LegacyDemoSourceSystem, LegacyDemoFlowReferences],
  );
  await manager.query(
    `DELETE FROM integration_interface_messages WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [LegacyDemoSourceSystem, LegacyDemoFlowReferences],
  );
  await manager.query(
    `DELETE FROM integration_import_batches WHERE source_system = $1 AND batch_reference = ANY($2::text[])`,
    [LegacyDemoSourceSystem, codes.ImportBatchReferences],
  );
  await manager.query(
    `DELETE FROM workflow_handoffs WHERE core_flow_instance_id IN (SELECT id FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoFlowReferences],
  );
  await manager.query(
    `DELETE FROM workflow_milestones WHERE core_flow_instance_id IN (SELECT id FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoFlowReferences],
  );
  await manager.query(
    `DELETE FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [LegacyDemoSourceSystem, LegacyDemoFlowReferences],
  );
  await manager.query(`DELETE FROM shipping_package_staging WHERE staging_code = ANY($1::text[])`, [
    codes.ShippingStagingCodes,
  ]);
  await manager.query(
    `DELETE FROM outbound_package_contents WHERE package_id IN (SELECT id FROM outbound_packages WHERE package_code = ANY($1::text[]))`,
    [codes.PackageCodes],
  );
  await manager.query(`DELETE FROM outbound_packages WHERE package_code = ANY($1::text[])`, [codes.PackageCodes]);
  await manager.query(`DELETE FROM outbound_pack_sessions WHERE session_number = ANY($1::text[])`, [
    codes.PackSessionNumbers,
  ]);
  await manager.query(`DELETE FROM outbound_pick_tasks WHERE task_number = ANY($1::text[])`, [codes.PickTaskNumbers]);
  await manager.query(`DELETE FROM outbound_pick_releases WHERE release_number = ANY($1::text[])`, [
    codes.PickReleaseNumbers,
  ]);
  await manager.query(
    `DELETE FROM outbound_allocation_lines WHERE allocation_id IN (SELECT id FROM outbound_allocations WHERE allocation_number = ANY($1::text[]))`,
    [codes.AllocationNumbers],
  );
  await manager.query(`DELETE FROM outbound_allocations WHERE allocation_number = ANY($1::text[])`, [
    codes.AllocationNumbers,
  ]);
  await manager.query(
    `DELETE FROM outbound_order_lines WHERE outbound_order_id IN (SELECT id FROM outbound_orders WHERE source_system = $1 AND order_number = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, codes.OutboundOrderNumbers],
  );
  await manager.query(`DELETE FROM outbound_orders WHERE source_system = $1 AND order_number = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    codes.OutboundOrderNumbers,
  ]);
  await manager.query(`DELETE FROM inventory_movements WHERE movement_code = ANY($1::text[])`, [codes.MovementCodes]);
  await manager.query(`DELETE FROM inventory_transactions WHERE transaction_code = ANY($1::text[])`, [
    codes.TransactionCodes,
  ]);
  await manager.query(`DELETE FROM putaway_tasks WHERE task_code = ANY($1::text[])`, [codes.PutawayTaskCodes]);
  await manager.query(`DELETE FROM inbound_putaway_releases WHERE idempotency_key = ANY($1::text[])`, [
    codes.PutawayReleaseIdempotencyKeys,
  ]);
  await manager.query(
    `DELETE FROM inbound_lpns WHERE idempotency_key = ANY($1::text[]) AND lpn_code = ANY($2::text[])`,
    [codes.LpnIdempotencyKeys, LegacyDemoFlowLpnCodes],
  );
  await manager.query(`DELETE FROM qc_results WHERE idempotency_key = ANY($1::text[])`, [codes.QcResultKeys]);
  await manager.query(`DELETE FROM qc_tasks WHERE idempotency_key = ANY($1::text[])`, [codes.QcTaskKeys]);
  await manager.query(`DELETE FROM receipt_lines WHERE idempotency_key = ANY($1::text[])`, [
    codes.ReceiptLineIdempotencyKeys,
  ]);
  await manager.query(`DELETE FROM receiving_sessions WHERE session_key = ANY($1::text[])`, [
    codes.ReceivingSessionKeys,
  ]);
  await manager.query(`DELETE FROM receipts WHERE business_reference = ANY($1::text[])`, [
    codes.ReceiptBusinessReferences,
  ]);
  await manager.query(
    `DELETE FROM inbound_plan_lines WHERE inbound_plan_id IN (SELECT id FROM inbound_plans WHERE source_system = $1 AND source_document_type = 'DEMO_FLOW' AND (business_reference = ANY($2::text[]) OR source_document_number = ANY($3::text[])))`,
    [LegacyDemoSourceSystem, codes.InboundPlanBusinessReferences, codes.InboundPlanSourceDocumentNumbers],
  );
  await manager.query(
    `DELETE FROM inbound_plans WHERE source_system = $1 AND source_document_type = 'DEMO_FLOW' AND (business_reference = ANY($2::text[]) OR source_document_number = ANY($3::text[]))`,
    [LegacyDemoSourceSystem, codes.InboundPlanBusinessReferences, codes.InboundPlanSourceDocumentNumbers],
  );
};

const BuildLegacyDemoDataCcFlowCleanupCodes = (): {
  ImportBatchReferences: string[];
  ShippingStagingCodes: string[];
  PackageCodes: string[];
  PackSessionNumbers: string[];
  PickTaskNumbers: string[];
  PickReleaseNumbers: string[];
  AllocationNumbers: string[];
  OutboundOrderNumbers: string[];
  MovementCodes: string[];
  TransactionCodes: string[];
  PutawayTaskCodes: string[];
  PutawayReleaseIdempotencyKeys: string[];
  LpnIdempotencyKeys: string[];
  QcResultKeys: string[];
  QcTaskKeys: string[];
  ReceiptLineIdempotencyKeys: string[];
  ReceivingSessionKeys: string[];
  ReceiptBusinessReferences: string[];
  ReconciliationEvidenceRefs: string[];
  ReconciliationIdempotencyKeys: string[];
  InboundPlanBusinessReferences: string[];
  InboundPlanSourceDocumentNumbers: string[];
} => ({
  ImportBatchReferences: LegacyDemoFlowReferences.map((reference) => `${reference}-IMPORT`),
  ShippingStagingCodes: LegacyDemoFlowReferences.map((reference) => `STG-${reference}`),
  PackageCodes: LegacyDemoFlowReferences.map((reference) => `PKG-${reference}`),
  PackSessionNumbers: LegacyDemoFlowReferences.map((reference) => `PS-${reference}`),
  PickTaskNumbers: LegacyDemoFlowReferences.map((reference) => `PT-${reference}`),
  PickReleaseNumbers: LegacyDemoFlowReferences.map((reference) => `PR-${reference}`),
  AllocationNumbers: LegacyDemoFlowReferences.map((reference) => `AL-${reference}`),
  OutboundOrderNumbers: LegacyDemoFlowReferences.map((reference) => `OO-${reference}`),
  MovementCodes: LegacyDemoFlowReferences.flatMap((reference) => [`MV-${reference}-PUTAWAY`, `MV-${reference}-GI`]),
  TransactionCodes: LegacyDemoFlowReferences.flatMap((reference) => [`TX-${reference}-PUTAWAY`, `TX-${reference}-GI`]),
  PutawayTaskCodes: LegacyDemoFlowReferences.map((reference) => `PA-${reference}`),
  PutawayReleaseIdempotencyKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-putaway-release`),
  LpnIdempotencyKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-lpn`),
  QcResultKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-qc-result`),
  QcTaskKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-qc-task`),
  ReceiptLineIdempotencyKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-receipt-line`),
  ReceivingSessionKeys: LegacyDemoFlowReferences.map((reference) => `RS-${reference}`),
  ReceiptBusinessReferences: LegacyDemoFlowReferences.map((reference) => `${reference}-RCPT`),
  ReconciliationEvidenceRefs: LegacyDemoFlowReferences.map((reference) => `${reference}:reconciliation`),
  ReconciliationIdempotencyKeys: LegacyDemoFlowReferences.map((reference) => `${reference}-reconciliation`),
  InboundPlanBusinessReferences: LegacyDemoFlowReferences.map((reference) => `${reference}-INB`),
  InboundPlanSourceDocumentNumbers: LegacyDemoFlowReferences.map((reference) => `${reference}-ASN`),
});

const CleanupLegacyDemoDataCcMasterRowsUnsafe = async (manager: EntityManager): Promise<void> => {
  await manager.query(
    `DELETE FROM inventory_balances WHERE source_system = $2 AND (reference_id = ANY($1::text[]) OR dimension_id IN (SELECT id FROM inventory_dimensions WHERE source_system = $2 AND (lpn_code = ANY($1::text[]) OR sku_id IN (SELECT id FROM skus WHERE source_system = $2 AND sku_code = ANY($3::text[])))))`,
    [LegacyDemoInventoryLpnCodes, LegacyDemoSourceSystem, LegacyDemoSkuCodes],
  );
  await manager.query(
    `DELETE FROM inventory_dimensions WHERE source_system = $2 AND (lpn_code = ANY($1::text[]) OR reference_id = ANY($1::text[]) OR sku_id IN (SELECT id FROM skus WHERE source_system = $2 AND sku_code = ANY($3::text[])))`,
    [LegacyDemoInventoryLpnCodes, LegacyDemoSourceSystem, LegacyDemoSkuCodes],
  );
  await manager.query(
    `DELETE FROM item_coverages WHERE source_system = $1 AND sku_id IN (SELECT id FROM skus WHERE source_system = $1 AND sku_code = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoSkuCodes],
  );
  await manager.query(
    `DELETE FROM sku_barcodes WHERE source_system = $1 AND sku_id IN (SELECT id FROM skus WHERE source_system = $1 AND sku_code = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoSkuCodes],
  );
  await manager.query(
    `DELETE FROM uom_conversions WHERE source_system = $1 AND (sku_id IN (SELECT id FROM skus WHERE source_system = $1 AND sku_code = ANY($2::text[])) OR from_uom_id IN (SELECT id FROM uoms WHERE source_system = $1 AND uom_code = ANY($3::text[])) OR to_uom_id IN (SELECT id FROM uoms WHERE source_system = $1 AND uom_code = ANY($3::text[])))`,
    [LegacyDemoSourceSystem, LegacyDemoSkuCodes, LegacyDemoUomCodes],
  );
  await manager.query(
    `DELETE FROM pack_definitions WHERE source_system = $1 AND sku_id IN (SELECT id FROM skus WHERE source_system = $1 AND sku_code = ANY($2::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoSkuCodes],
  );
  await manager.query(`DELETE FROM skus WHERE source_system = $1 AND sku_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoSkuCodes,
  ]);
  await manager.query(
    `
      DELETE FROM uoms u
      WHERE u.source_system = $1
        AND u.uom_code = ANY($2::text[])
        AND NOT EXISTS (SELECT 1 FROM skus s WHERE s.base_uom_id = u.id OR s.inventory_uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM pack_definitions p WHERE p.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM sku_barcodes b WHERE b.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM uom_conversions c WHERE c.from_uom_id = u.id OR c.to_uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inventory_dimensions d WHERE d.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inbound_plan_lines l WHERE l.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM receipt_lines l WHERE l.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inbound_lpns l WHERE l.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM qc_tasks t WHERE t.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inbound_putaway_releases r WHERE r.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM putaway_tasks t WHERE t.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inventory_transactions t WHERE t.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM cycle_count_works w WHERE w.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM replenishment_tasks t WHERE t.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM outbound_order_lines l WHERE l.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM outbound_allocation_lines l WHERE l.uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM outbound_pick_tasks t WHERE t.uom_id = u.id OR t.substitution_uom_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM outbound_package_contents c WHERE c.uom_id = u.id)
    `,
    [LegacyDemoSourceSystem, LegacyDemoUomCodes],
  );
  await manager.query(
    `
      DELETE FROM inventory_statuses s
      WHERE s.source_system = $1
        AND s.status_code = ANY($2::text[])
        AND NOT EXISTS (SELECT 1 FROM inventory_dimensions d WHERE d.inventory_status_id = s.id)
    `,
    [LegacyDemoSourceSystem, LegacyDemoInventoryStatusCodes],
  );
  await AssertNoBlockedLegacyDemoDataCcCatalogRows(manager);
  await manager.query(
    `DELETE FROM warehouse_profile_assignments WHERE source_system = $1 AND reference_id = ANY($2::text[])`,
    [LegacyDemoSourceSystem, LegacyDemoWarehouseCodes],
  );
  await manager.query(`DELETE FROM warehouse_profiles WHERE source_system = $1 AND profile_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoWarehouseProfileCodes,
  ]);
  await manager.query(
    `DELETE FROM locations WHERE source_system = $1 AND location_code = ANY($2::text[]) AND warehouse_id IN (SELECT id FROM warehouses WHERE source_system = $1 AND warehouse_code = ANY($3::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoLocationCodes, LegacyDemoWarehouseCodes],
  );
  await manager.query(
    `DELETE FROM zones WHERE source_system = $1 AND zone_code = ANY($2::text[]) AND warehouse_id IN (SELECT id FROM warehouses WHERE source_system = $1 AND warehouse_code = ANY($3::text[]))`,
    [LegacyDemoSourceSystem, LegacyDemoZoneCodes, LegacyDemoWarehouseCodes],
  );
  await manager.query(`DELETE FROM location_profiles WHERE source_system = $1 AND profile_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoLocationProfileCodes,
  ]);
  await manager.query(`DELETE FROM warehouses WHERE source_system = $1 AND warehouse_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoWarehouseCodes,
  ]);
  await manager.query(`DELETE FROM sites WHERE source_system = $1 AND site_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoSiteCodes,
  ]);
  await manager.query(`DELETE FROM owners WHERE source_system = $1 AND owner_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoOwnerCodes,
  ]);
  await manager.query(`DELETE FROM partners WHERE source_system = $1 AND partner_code = ANY($2::text[])`, [
    LegacyDemoSourceSystem,
    LegacyDemoPartnerCodes,
  ]);
};

const AssertNoBlockedLegacyDemoDataCcCatalogRows = async (manager: EntityManager): Promise<void> => {
  const rows = (await manager.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM uoms WHERE source_system = $1 AND uom_code = ANY($2::text[])) AS "UomCount",
        (SELECT COUNT(*)::int FROM inventory_statuses WHERE source_system = $1 AND status_code = ANY($3::text[])) AS "StatusCount"
    `,
    [LegacyDemoSourceSystem, LegacyDemoUomCodes, LegacyDemoInventoryStatusCodes],
  )) as Array<{ UomCount?: number | string; StatusCount?: number | string }> | undefined;

  const uomCount = Number(rows?.[0]?.UomCount ?? 0);
  const statusCount = Number(rows?.[0]?.StatusCount ?? 0);
  if (uomCount > 0 || statusCount > 0) {
    throw new Error(
      `DEMO-DATA-LTA seed found legacy DEMO-DATA-CC catalog rows still referenced outside old demo scope (${uomCount} UOM, ${statusCount} inventory status). Run yarn.cmd demo-data:prepare to clear local/dev DB before reseeding LTA demo data.`,
    );
  }
};
