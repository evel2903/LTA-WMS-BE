import { createHash, randomUUID } from 'crypto';
import type { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';
import { IntegrationReconciliationSeverity } from '@modules/Integration/Domain/Enums/IntegrationReconciliationSeverity';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { IntegrationReconciliationItemOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationItemOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { ReceiptDocumentStatus } from '@modules/Inbound/Domain/Enums/ReceiptDocumentStatus';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';
import { InboundLpnOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundLpnOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPutawayReleaseOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPutawayReleaseOrmEntity';
import { QcResultOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcResultOrmEntity';
import { QcTaskOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcTaskOrmEntity';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';
import { ReceivingSessionOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceivingSessionOrmEntity';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PackSessionStatus } from '@modules/Outbound/Domain/Enums/PackSessionStatus';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { PackageContentOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageContentOrmEntity';
import { PackageOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageOrmEntity';
import { PackSessionOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackSessionOrmEntity';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';
import { GoodsIssueStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueStatus';
import { GoodsIssueTriggerStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueTriggerStatus';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { ShipmentPackageStagingOrmEntity } from '@modules/Shipping/Infrastructure/Persistence/Entities/ShipmentPackageStagingOrmEntity';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { GetEnv } from '@shared/Config/Env/Env';
import { BuildDemoDataCcInventoryDimensionHash } from '@shared/Database/Seed/DemoDataCcInventorySeed';
import { CleanupDemoDataCcScreenCoverage } from '@shared/Database/Seed/DemoDataCcScreenCoverageSeed';
import { AssertDemoDataCcLocalConnectionTarget } from '@shared/Database/Seed/DemoDataCcTargetGuard';

const DemoSourceSystem = 'DEMO-DATA-LTA';
const DemoFlowPrefix = 'LTA-DEMO-';
const LegacyDemoSourceSystem = 'DEMO-DATA-CC';
const LegacyDemoFlowReferences = ['CC-DEMO-WT01', 'CC-DEMO-WT05', 'CC-DEMO-WT06'] as const;
const DemoFlowLpnCodes = ['LTA-FLOW-LPN-WT01'] as const;
const LegacyDemoFlowLpnCodes = ['CC-FLOW-LPN-WT01', 'CC-FLOW-LPN-WT05', 'CC-FLOW-LPN-WT06'] as const;

export type DemoDataCcFlowScenario = {
  ScenarioCode: 'WT-01';
  FlowReference: string;
  SkuCode: string;
  Quantity: number;
  ContainerNumber: string;
  SealNumber: string;
  ShipmentReference: string;
  TruckReference: string;
  VehicleNumber: string;
  LoadReference: string;
  GateOutReference: string;
  InboundLocationCode: string;
  PutawayLocationCode: string;
  PickLocationCode: string;
  PackLocationCode: string;
  DockLocationCode: string;
  GoodsIssueTrigger: 'at_loading';
};

export type DemoDataCcFlowPlan = {
  WarehouseCode: string;
  OwnerCode: string;
  SupplierCode: string;
  CustomerCode: string;
  CarrierCode: string;
  UomCode: string;
  Scenarios: DemoDataCcFlowScenario[];
};

export type DemoDataCcFlowSeedResult = {
  ScenarioCount: number;
  InboundPlanCount: number;
  ReceiptCount: number;
  PutawayTaskCount: number;
  OutboundOrderCount: number;
  PackageCount: number;
  ShipmentCount: number;
  OutboxMessageCount: number;
  ReconciliationRunCount: number;
  ScenarioReferences: string[];
};

export type DemoDataCcFlowOutboxPayload = {
  SourceId: string;
  ScenarioCode: DemoDataCcFlowScenario['ScenarioCode'];
  Quantity: number;
  UomCode: string;
  ShipmentReference?: string;
  TruckReference?: string;
  VehicleNumber?: string;
  LoadReference?: string;
  GateOutReference?: string;
  ContainerNumber?: string;
  SealNumber?: string;
};

export const DemoDataCcFlowOutboxEventTypes = [
  'InboundImported',
  'PutawayConfirmed',
  'OutboundOrderImported',
  'AllocationCompleted',
  'PickConfirmed',
  'PackagePacked',
  'LoadingConfirmed',
  'GoodsIssuePosted',
] as const;

export type DemoDataCcFlowOutboxEventType = (typeof DemoDataCcFlowOutboxEventTypes)[number];

type DemoDataCcFlowContext = {
  ActorId: string | null;
  Owner: OwnerOrmEntity;
  Warehouse: WarehouseOrmEntity;
  Supplier: PartnerOrmEntity;
  Customer: PartnerOrmEntity;
  Carrier: PartnerOrmEntity;
  WarehouseProfile: WarehouseProfileOrmEntity;
  Uom: UomOrmEntity;
  SkusByCode: Map<string, SkuOrmEntity>;
  LocationsByCode: Map<string, LocationOrmEntity>;
  InventoryStatusesByCode: Map<string, InventoryStatusOrmEntity>;
};

type ScenarioIds = {
  CoreFlowInstanceId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  ReceivingSessionId: string;
  QcTaskId: string;
  QcResultId: string;
  InboundLpnId: string;
  InboundPutawayReleaseId: string;
  PutawayTaskId: string;
  PutawaySourceDimensionId: string;
  PutawaySourceBalanceId: string;
  PutawayDestinationDimensionId: string;
  PutawayDestinationBalanceId: string;
  LoadedDimensionId: string;
  LoadedBalanceId: string;
  PutawayTransactionId: string;
  PutawayMovementId: string;
  OutboundOrderId: string;
  OutboundOrderLineId: string;
  AllocationId: string;
  AllocationLineId: string;
  PickReleaseId: string;
  PickTaskId: string;
  PackSessionId: string;
  PackageId: string;
  PackageContentId: string;
  ShipmentStagingId: string;
  GoodsIssueTransactionId: string;
  GoodsIssueMovementId: string;
  ImportBatchId: string;
  InterfaceMessageId: string;
  ReconciliationRunId: string;
  ReconciliationItemId: string;
};

export const BuildDemoDataCcFlowPlan = (): DemoDataCcFlowPlan => ({
  WarehouseCode: 'LTA-HCM-01',
  OwnerCode: 'LTA',
  SupplierCode: 'LTA-SUP-SEAL',
  CustomerCode: 'LTA-CUS-SEAL',
  CarrierCode: 'LTA-CAR-3PL',
  UomCode: 'BOX',
  Scenarios: [scenario('WT-01', 'LTA-SEAL-CABLE-001', 12, 'RSV-A01-R01-L01-B01', 'PF-A01-R01-L01-B01')],
});

const scenario = (
  ScenarioCode: DemoDataCcFlowScenario['ScenarioCode'],
  SkuCode: string,
  Quantity: number,
  PutawayLocationCode: string,
  PickLocationCode: string,
): DemoDataCcFlowScenario => ({
  ScenarioCode,
  FlowReference: `${DemoFlowPrefix}${ScenarioCode.replace('-', '')}`,
  SkuCode,
  Quantity,
  ContainerNumber: 'CONT-LTA-WT01-0001',
  SealNumber: 'SEAL-LTA-WT01-20260701',
  ShipmentReference: 'LTA-WT01-SEAL-DEMO',
  TruckReference: 'TRUCK-LTA-WT01-0001',
  VehicleNumber: '51D-WT01',
  LoadReference: 'LOAD-LTA-WT01-SEAL',
  GateOutReference: 'GATEOUT-LTA-WT01-SEAL',
  InboundLocationCode: 'QC-A01-STG01',
  PutawayLocationCode,
  PickLocationCode,
  PackLocationCode: 'PACK-A01-ST01',
  DockLocationCode: 'LOAD-A01-D01',
  GoodsIssueTrigger: 'at_loading',
});

export const BuildDemoDataCcFlowOutboxPayload = (input: {
  EventType: DemoDataCcFlowOutboxEventType;
  Scenario: DemoDataCcFlowScenario;
  SourceId: string;
  UomCode: string;
}): DemoDataCcFlowOutboxPayload => {
  if (!DemoDataCcFlowOutboxEventTypes.includes(input.EventType)) {
    throw new Error(`Unsupported demo-data outbox event: ${input.EventType as string}.`);
  }

  const payload: DemoDataCcFlowOutboxPayload = {
    SourceId: input.SourceId,
    ScenarioCode: input.Scenario.ScenarioCode,
    Quantity: input.Scenario.Quantity,
    UomCode: input.UomCode,
  };

  if (['PackagePacked', 'LoadingConfirmed', 'GoodsIssuePosted'].includes(input.EventType)) {
    payload.ContainerNumber = input.Scenario.ContainerNumber;
    payload.SealNumber = input.Scenario.SealNumber;
  }

  if (['LoadingConfirmed', 'GoodsIssuePosted'].includes(input.EventType)) {
    payload.ShipmentReference = input.Scenario.ShipmentReference;
    payload.TruckReference = input.Scenario.TruckReference;
    payload.VehicleNumber = input.Scenario.VehicleNumber;
    payload.LoadReference = input.Scenario.LoadReference;
  }

  if (input.EventType === 'GoodsIssuePosted') {
    payload.GateOutReference = input.Scenario.GateOutReference;
  }

  return payload;
};

export const BuildDemoDataCcFlowOutboxEvidenceRefs = (input: {
  EventType: DemoDataCcFlowOutboxEventType;
  Scenario: DemoDataCcFlowScenario;
}): string[] => {
  if (!DemoDataCcFlowOutboxEventTypes.includes(input.EventType)) {
    throw new Error(`Unsupported demo-data outbox event: ${input.EventType as string}.`);
  }

  const refs = [`${input.Scenario.FlowReference}:${input.EventType}`];

  if (['PackagePacked', 'LoadingConfirmed', 'GoodsIssuePosted'].includes(input.EventType)) {
    refs.push(`container:${input.Scenario.ContainerNumber}`, `seal:${input.Scenario.SealNumber}`);
  }

  if (['LoadingConfirmed', 'GoodsIssuePosted'].includes(input.EventType)) {
    refs.push(
      `shipment:${input.Scenario.ShipmentReference}`,
      `truck:${input.Scenario.TruckReference}`,
      `vehicle:${input.Scenario.VehicleNumber}`,
      `load:${input.Scenario.LoadReference}`,
    );
  }

  if (input.EventType === 'GoodsIssuePosted') {
    refs.push(`gateout:${input.Scenario.GateOutReference}`);
  }

  return refs;
};

export const BuildDemoDataCcFlowShippingEvidenceRefs = (input: DemoDataCcFlowScenario): string[] => [
  `${input.FlowReference}:shipping`,
  `container:${input.ContainerNumber}`,
  `seal:${input.SealNumber}`,
  `shipment:${input.ShipmentReference}`,
  `truck:${input.TruckReference}`,
  `vehicle:${input.VehicleNumber}`,
  `load:${input.LoadReference}`,
  `gateout:${input.GateOutReference}`,
];

export const DemoDataCcForbiddenFlowInventoryStatuses = [
  'SHIPPED',
  'GATE_OUT',
  'GOODS_ISSUE_POSTED',
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

export const SeedDemoDataCcFlow = async (dataSource: DataSource): Promise<DemoDataCcFlowSeedResult> =>
  await dataSource.transaction(async (manager) => {
    const plan = BuildDemoDataCcFlowPlan();
    await CleanupDemoDataCcFlow(manager);
    const context = await BuildContext(manager, plan);
    const seeded: Array<{ FlowReference: string; OutboxMessageCount: number }> = [];

    for (const currentScenario of plan.Scenarios) {
      seeded.push(await SeedScenario(manager, context, currentScenario, plan.UomCode));
    }

    return {
      ScenarioCount: seeded.length,
      InboundPlanCount: seeded.length,
      ReceiptCount: seeded.length,
      PutawayTaskCount: seeded.length,
      OutboundOrderCount: seeded.length,
      PackageCount: seeded.length,
      ShipmentCount: seeded.length,
      OutboxMessageCount: seeded.reduce((sum, item) => sum + item.OutboxMessageCount, 0),
      ReconciliationRunCount: seeded.length,
      ScenarioReferences: seeded.map((item) => item.FlowReference),
    };
  });

export const CleanupDemoDataCcFlow = async (manager: EntityManager): Promise<void> => {
  AssertDemoDataCcLocalConnectionTarget(manager.connection.options, GetEnv(), 'EntityManager.connection.options');
  await CleanupDemoDataCcScreenCoverage(manager);
  await CleanupDemoDataCcFlowByReferences(
    manager,
    DemoSourceSystem,
    BuildDemoDataCcFlowPlan().Scenarios.map((item) => item.FlowReference),
    DemoFlowLpnCodes,
  );
  await CleanupDemoDataCcFlowByReferences(
    manager,
    LegacyDemoSourceSystem,
    LegacyDemoFlowReferences,
    LegacyDemoFlowLpnCodes,
  );
};

const CleanupDemoDataCcFlowByReferences = async (
  manager: EntityManager,
  sourceSystem: string,
  flowReferences: readonly string[],
  lpnCodes: readonly string[],
): Promise<void> => {
  const codes = BuildDemoDataCcFlowCleanupCodes(flowReferences);
  await manager.query(
    `DELETE FROM integration_reconciliation_items WHERE run_id IN (SELECT id FROM integration_reconciliation_runs WHERE business_reference = ANY($1::text[]) AND idempotency_key = ANY($2::text[]) AND evidence_refs ?| $3::text[])`,
    [flowReferences, codes.ReconciliationIdempotencyKeys, codes.ReconciliationEvidenceRefs],
  );
  await manager.query(
    `DELETE FROM integration_reconciliation_runs WHERE business_reference = ANY($1::text[]) AND idempotency_key = ANY($2::text[]) AND evidence_refs ?| $3::text[]`,
    [flowReferences, codes.ReconciliationIdempotencyKeys, codes.ReconciliationEvidenceRefs],
  );
  await manager.query(
    `DELETE FROM integration_outbox_messages WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [sourceSystem, flowReferences],
  );
  await manager.query(
    `DELETE FROM integration_interface_messages WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [sourceSystem, flowReferences],
  );
  await manager.query(
    `DELETE FROM integration_import_batches WHERE source_system = $1 AND batch_reference = ANY($2::text[])`,
    [sourceSystem, codes.ImportBatchReferences],
  );
  await manager.query(
    `DELETE FROM workflow_handoffs WHERE core_flow_instance_id IN (SELECT id FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[]))`,
    [sourceSystem, flowReferences],
  );
  await manager.query(
    `DELETE FROM workflow_milestones WHERE core_flow_instance_id IN (SELECT id FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[]))`,
    [sourceSystem, flowReferences],
  );
  await manager.query(
    `DELETE FROM core_flow_instances WHERE source_system = $1 AND business_reference = ANY($2::text[])`,
    [sourceSystem, flowReferences],
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
    [sourceSystem, codes.OutboundOrderNumbers],
  );
  await manager.query(`DELETE FROM outbound_orders WHERE source_system = $1 AND order_number = ANY($2::text[])`, [
    sourceSystem,
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
    [codes.LpnIdempotencyKeys, lpnCodes],
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
    [sourceSystem, codes.InboundPlanBusinessReferences, codes.InboundPlanSourceDocumentNumbers],
  );
  await manager.query(
    `DELETE FROM inbound_plans WHERE source_system = $1 AND source_document_type = 'DEMO_FLOW' AND (business_reference = ANY($2::text[]) OR source_document_number = ANY($3::text[]))`,
    [sourceSystem, codes.InboundPlanBusinessReferences, codes.InboundPlanSourceDocumentNumbers],
  );
  await manager.query(
    `DELETE FROM inventory_balances WHERE source_system = $1 AND dimension_id IN (SELECT id FROM inventory_dimensions WHERE source_system = $1 AND reference_id = ANY($2::text[]))`,
    [sourceSystem, codes.InventoryReferenceIds],
  );
  await manager.query(`DELETE FROM inventory_dimensions WHERE source_system = $1 AND reference_id = ANY($2::text[])`, [
    sourceSystem,
    codes.InventoryReferenceIds,
  ]);
};

const BuildDemoDataCcFlowCleanupCodes = (
  flowReferences: readonly string[],
): {
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
  InventoryReferenceIds: string[];
} => ({
  ImportBatchReferences: flowReferences.map((reference) => `${reference}-IMPORT`),
  ShippingStagingCodes: flowReferences.map((reference) => `STG-${reference}`),
  PackageCodes: flowReferences.map((reference) => `PKG-${reference}`),
  PackSessionNumbers: flowReferences.map((reference) => `PS-${reference}`),
  PickTaskNumbers: flowReferences.map((reference) => `PT-${reference}`),
  PickReleaseNumbers: flowReferences.map((reference) => `PR-${reference}`),
  AllocationNumbers: flowReferences.map((reference) => `AL-${reference}`),
  OutboundOrderNumbers: flowReferences.map((reference) => `OO-${reference}`),
  MovementCodes: flowReferences.flatMap((reference) => [`MV-${reference}-PUTAWAY`, `MV-${reference}-GI`]),
  TransactionCodes: flowReferences.flatMap((reference) => [`TX-${reference}-PUTAWAY`, `TX-${reference}-GI`]),
  PutawayTaskCodes: flowReferences.map((reference) => `PA-${reference}`),
  PutawayReleaseIdempotencyKeys: flowReferences.map((reference) => `${reference}-putaway-release`),
  LpnIdempotencyKeys: flowReferences.map((reference) => `${reference}-lpn`),
  QcResultKeys: flowReferences.map((reference) => `${reference}-qc-result`),
  QcTaskKeys: flowReferences.map((reference) => `${reference}-qc-task`),
  ReceiptLineIdempotencyKeys: flowReferences.map((reference) => `${reference}-receipt-line`),
  ReceivingSessionKeys: flowReferences.map((reference) => `RS-${reference}`),
  ReceiptBusinessReferences: flowReferences.map((reference) => `${reference}-RCPT`),
  ReconciliationEvidenceRefs: flowReferences.map((reference) => `${reference}:reconciliation`),
  ReconciliationIdempotencyKeys: flowReferences.map((reference) => `${reference}-reconciliation`),
  InboundPlanBusinessReferences: flowReferences.map((reference) => `${reference}-INB`),
  InboundPlanSourceDocumentNumbers: flowReferences.map((reference) => `${reference}-ASN`),
  InventoryReferenceIds: flowReferences.flatMap((reference) => [
    `${reference}:putaway-source`,
    `${reference}:putaway-destination`,
    `${reference}:loaded`,
  ]),
});

const BuildContext = async (manager: EntityManager, plan: DemoDataCcFlowPlan): Promise<DemoDataCcFlowContext> => {
  const admin = await manager.getRepository(UserOrmEntity).findOne({ where: { EmailAddress: 'admin@example.com' } });
  const owner = await RequiredByCode(manager.getRepository(OwnerOrmEntity), 'OwnerCode', plan.OwnerCode);
  const warehouse = await RequiredByCode(
    manager.getRepository(WarehouseOrmEntity),
    'WarehouseCode',
    plan.WarehouseCode,
  );
  const supplier = await RequiredPartner(manager, plan.SupplierCode, PartnerType.Supplier);
  const customer = await RequiredPartner(manager, plan.CustomerCode, PartnerType.Customer);
  const carrier = await RequiredPartner(manager, plan.CarrierCode, PartnerType.Carrier);
  const warehouseProfile = await RequiredByCode(
    manager.getRepository(WarehouseProfileOrmEntity),
    'ProfileCode',
    'WP-LTA-HCM-DEMO',
  );
  const uom = await RequiredByCode(manager.getRepository(UomOrmEntity), 'UomCode', plan.UomCode);
  const skusByCode = await RequiredMapByCode(
    manager.getRepository(SkuOrmEntity),
    'SkuCode',
    plan.Scenarios.map((item) => item.SkuCode),
  );
  const locationsByCode = await RequiredMapByCode(
    manager.getRepository(LocationOrmEntity),
    'LocationCode',
    [...new Set(plan.Scenarios.flatMap(ScenarioLocationCodes))],
    { WarehouseId: warehouse.Id },
  );
  const inventoryStatusesByCode = await RequiredMapByCode(
    manager.getRepository(InventoryStatusOrmEntity),
    'StatusCode',
    ['READY_FOR_PUTAWAY', 'AVAILABLE', 'LOADED'],
  );

  return {
    ActorId: admin?.Id ?? null,
    Owner: owner,
    Warehouse: warehouse,
    Supplier: supplier,
    Customer: customer,
    Carrier: carrier,
    WarehouseProfile: warehouseProfile,
    Uom: uom,
    SkusByCode: skusByCode,
    LocationsByCode: locationsByCode,
    InventoryStatusesByCode: inventoryStatusesByCode,
  };
};

const ScenarioLocationCodes = (item: DemoDataCcFlowScenario): string[] => [
  item.InboundLocationCode,
  item.PutawayLocationCode,
  item.PickLocationCode,
  item.PackLocationCode,
  item.DockLocationCode,
];

const RequiredPartner = async (
  manager: EntityManager,
  partnerCode: string,
  partnerType: PartnerType,
): Promise<PartnerOrmEntity> => {
  const partner = await manager.getRepository(PartnerOrmEntity).findOne({
    where: {
      PartnerCode: partnerCode,
      PartnerType: partnerType,
    },
  });
  if (!partner) {
    throw new Error(`DEMO-DATA-LTA flow seed requires partner ${partnerCode}.`);
  }

  return partner;
};

const RequiredByCode = async <T extends object>(
  repo: Repository<T>,
  codeField: keyof T & string,
  code: string,
): Promise<T> => {
  const entity = await repo.findOne({ where: { [codeField]: code } as never });
  if (!entity) {
    throw new Error(`DEMO-DATA-LTA flow seed requires ${repo.metadata.name}.${codeField}=${code}.`);
  }

  return entity;
};

const RequiredMapByCode = async <T extends object>(
  repo: Repository<T>,
  codeField: keyof T & string,
  codes: string[],
  extraWhere: Record<string, unknown> = {},
): Promise<Map<string, T>> => {
  const result = new Map<string, T>();
  for (const code of codes) {
    const entity = await repo.findOne({ where: { ...extraWhere, [codeField]: code } as never });
    if (!entity) {
      throw new Error(`DEMO-DATA-LTA flow seed requires ${repo.metadata.name}.${codeField}=${code}.`);
    }
    result.set(code, entity);
  }

  return result;
};

const SeedScenario = async (
  manager: EntityManager,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  uomCode: string,
): Promise<{ FlowReference: string; OutboxMessageCount: number }> => {
  const ids = BuildScenarioIds();
  const now = new Date('2026-06-26T03:30:00.000Z');
  const sku = RequiredMapValue(context.SkusByCode, item.SkuCode);
  const inboundLocation = RequiredMapValue(context.LocationsByCode, item.InboundLocationCode);
  const putawayLocation = RequiredMapValue(context.LocationsByCode, item.PutawayLocationCode);
  const packLocation = RequiredMapValue(context.LocationsByCode, item.PackLocationCode);
  const dockLocation = RequiredMapValue(context.LocationsByCode, item.DockLocationCode);
  const readyStatus = RequiredMapValue(context.InventoryStatusesByCode, 'READY_FOR_PUTAWAY');
  const availableStatus = RequiredMapValue(context.InventoryStatusesByCode, 'AVAILABLE');
  const loadedStatus = RequiredMapValue(context.InventoryStatusesByCode, 'LOADED');
  const flowReference = item.FlowReference;
  const lpnCode = `LTA-FLOW-LPN-${item.ScenarioCode.replace('-', '')}`;
  const lotNumber = `LTA-FLOW-BATCH-${item.ScenarioCode.replace('-', '')}`;
  const expiryDate = '2026-09-30';
  const eventIds = BuildOutboxIds();

  await SaveEntity(manager.getRepository(CoreFlowInstanceOrmEntity), {
    Id: ids.CoreFlowInstanceId,
    BusinessReference: flowReference,
    SourceSystem: DemoSourceSystem,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerCode: context.Owner.OwnerCode,
    CorrelationId: `${flowReference}-corr`,
    CurrentStage: CoreFlowStageCode.Shipping,
    Status: CoreFlowInstanceStatus.Completed,
    Metadata: {
      scenario: item.ScenarioCode,
      demo: 'LTA HCM',
      flow: 'inbound-to-goods-issue',
      containerNumber: item.ContainerNumber,
      sealNumber: item.SealNumber,
    },
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });

  await SeedCoreFlowMilestones(manager, ids, context, item, now);
  await SeedCoreFlowHandoffs(manager, ids, context, now);
  await SeedInbound(manager, ids, context, item, sku, now, lpnCode);
  await SeedOperationalInventory(manager, ids, context, item, sku, readyStatus, availableStatus, loadedStatus, now, {
    inboundLocation,
    putawayLocation,
    dockLocation,
    lpnCode,
    lotNumber,
    expiryDate,
  });
  await SeedOutbound(manager, ids, context, item, sku, putawayLocation, now, {
    flowReference,
    lpnCode,
    lotNumber,
    expiryDate,
  });
  await SeedShipping(manager, ids, context, item, packLocation, dockLocation, now, eventIds);
  await SeedIntegration(manager, ids, context, item, now, eventIds, uomCode);

  return {
    FlowReference: flowReference,
    OutboxMessageCount: Object.keys(eventIds).length,
  };
};

const BuildScenarioIds = (): ScenarioIds => ({
  CoreFlowInstanceId: randomUUID(),
  InboundPlanId: randomUUID(),
  InboundPlanLineId: randomUUID(),
  ReceiptId: randomUUID(),
  ReceiptLineId: randomUUID(),
  ReceivingSessionId: randomUUID(),
  QcTaskId: randomUUID(),
  QcResultId: randomUUID(),
  InboundLpnId: randomUUID(),
  InboundPutawayReleaseId: randomUUID(),
  PutawayTaskId: randomUUID(),
  PutawaySourceDimensionId: randomUUID(),
  PutawaySourceBalanceId: randomUUID(),
  PutawayDestinationDimensionId: randomUUID(),
  PutawayDestinationBalanceId: randomUUID(),
  LoadedDimensionId: randomUUID(),
  LoadedBalanceId: randomUUID(),
  PutawayTransactionId: randomUUID(),
  PutawayMovementId: randomUUID(),
  OutboundOrderId: randomUUID(),
  OutboundOrderLineId: randomUUID(),
  AllocationId: randomUUID(),
  AllocationLineId: randomUUID(),
  PickReleaseId: randomUUID(),
  PickTaskId: randomUUID(),
  PackSessionId: randomUUID(),
  PackageId: randomUUID(),
  PackageContentId: randomUUID(),
  ShipmentStagingId: randomUUID(),
  GoodsIssueTransactionId: randomUUID(),
  GoodsIssueMovementId: randomUUID(),
  ImportBatchId: randomUUID(),
  InterfaceMessageId: randomUUID(),
  ReconciliationRunId: randomUUID(),
  ReconciliationItemId: randomUUID(),
});

const BuildOutboxIds = () => ({
  InboundImported: randomUUID(),
  PutawayConfirmed: randomUUID(),
  OutboundImported: randomUUID(),
  AllocationCompleted: randomUUID(),
  PickConfirmed: randomUUID(),
  PackagePacked: randomUUID(),
  LoadingConfirmed: randomUUID(),
  GoodsIssuePosted: randomUUID(),
});

const SeedCoreFlowMilestones = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  now: Date,
): Promise<void> => {
  const milestones = [
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.SourceDocumentReceived, null),
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.GateInRecorded, null),
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.ReceiptLineReceived, 'PENDING_QC'),
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.QcCompleted, 'READY_FOR_PUTAWAY'),
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.LpnConfirmed, 'READY_FOR_PUTAWAY'),
    milestone(CoreFlowStageCode.Inbound, CoreFlowStepCode.InboundReleasedToPutaway, 'READY_FOR_PUTAWAY'),
    milestone(CoreFlowStageCode.Storage, CoreFlowStepCode.PutawayTaskReleased, 'READY_FOR_PUTAWAY'),
    milestone(CoreFlowStageCode.Storage, CoreFlowStepCode.PutawayConfirmed, 'AVAILABLE'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.OutboundOrderReceived, 'AVAILABLE'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.AllocationCompleted, 'ALLOCATED'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.ReleasedToWarehouse, 'RELEASED'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.PickConfirmed, 'PICKED'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.PackagePacked, 'PACKED'),
    milestone(CoreFlowStageCode.Outbound, CoreFlowStepCode.PackageReadyForStaging, 'READY_FOR_STAGING'),
    milestone(CoreFlowStageCode.Shipping, CoreFlowStepCode.PackageStaged, 'STAGED'),
    milestone(CoreFlowStageCode.Shipping, CoreFlowStepCode.DockTruckMilestoneRecorded, null),
    milestone(CoreFlowStageCode.Shipping, CoreFlowStepCode.LoadingConfirmed, 'LOADED'),
    milestone(CoreFlowStageCode.Shipping, CoreFlowStepCode.GateOutRecorded, null),
    milestone(CoreFlowStageCode.Shipping, CoreFlowStepCode.GoodsIssuePosted, null),
  ];

  for (const [index, current] of milestones.entries()) {
    await SaveEntity(manager.getRepository(WorkflowMilestoneOrmEntity), {
      Id: randomUUID(),
      CoreFlowInstanceId: ids.CoreFlowInstanceId,
      StageCode: current.StageCode,
      StepCode: current.StepCode,
      MilestoneStatus: WorkflowMilestoneStatus.Completed,
      InventoryStatusCode: current.InventoryStatusCode,
      ReasonCodeId: null,
      ReasonNote: null,
      ExceptionCaseId: null,
      Metadata: {
        scenario: item.ScenarioCode,
        sequence: index + 1,
        containerNumber: item.ContainerNumber,
        sealNumber: item.SealNumber,
      },
      OccurredAt: AddMinutes(now, index),
      CreatedBy: context.ActorId,
    });
  }
};

const milestone = (
  StageCode: CoreFlowStageCode,
  StepCode: CoreFlowStepCode,
  InventoryStatusCode: string | null,
): { StageCode: CoreFlowStageCode; StepCode: CoreFlowStepCode; InventoryStatusCode: string | null } => ({
  StageCode,
  StepCode,
  InventoryStatusCode,
});

const SeedCoreFlowHandoffs = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  now: Date,
): Promise<void> => {
  const handoffs = [
    { FromStage: CoreFlowStageCode.Inbound, ToStage: CoreFlowStageCode.Storage },
    { FromStage: CoreFlowStageCode.Storage, ToStage: CoreFlowStageCode.Outbound },
    { FromStage: CoreFlowStageCode.Outbound, ToStage: CoreFlowStageCode.Shipping },
  ];

  for (const [index, current] of handoffs.entries()) {
    await SaveEntity(manager.getRepository(WorkflowHandoffOrmEntity), {
      Id: randomUUID(),
      CoreFlowInstanceId: ids.CoreFlowInstanceId,
      FromStage: current.FromStage,
      ToStage: current.ToStage,
      HandoffStatus: WorkflowHandoffStatus.Completed,
      BlockedReason: null,
      ReasonCodeId: null,
      ReasonNote: null,
      Metadata: { demo: true },
      OccurredAt: AddMinutes(now, 30 + index),
      CreatedBy: context.ActorId,
    });
  }
};

const SeedInbound = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  sku: SkuOrmEntity,
  now: Date,
  lpnCode: string,
): Promise<void> => {
  const flowReference = item.FlowReference;
  // IFB-13: resolved once here (mirrors the SeedScenario pattern) so the InboundPutawayRelease
  // insert below can use a real Id instead of hardcoding null.
  const inboundLocation = RequiredMapValue(context.LocationsByCode, item.InboundLocationCode);
  await SaveEntity(manager.getRepository(InboundPlanOrmEntity), {
    Id: ids.InboundPlanId,
    SourceSystem: DemoSourceSystem,
    SourceDocumentType: 'DEMO_FLOW',
    SourceDocumentNumber: `${flowReference}-ASN`,
    BusinessReference: `${flowReference}-INB`,
    SupplierId: context.Supplier.Id,
    SupplierCode: context.Supplier.PartnerCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    WarehouseProfileId: context.WarehouseProfile.Id,
    ExpectedArrivalAt: now,
    Status: InboundPlanDocumentStatus.Closed,
    GateInStatus: InboundGateInStatus.Recorded,
    GateInAt: AddMinutes(now, 1),
    GateReference: `${flowReference}-GATE-IN`,
    VehicleNumber: `51C-${item.ScenarioCode.replace('-', '')}`,
    DriverName: 'Tài xế demo LTA',
    EvidenceRefs: [`${flowReference}:inbound-plan`],
    CoreFlowInstanceId: ids.CoreFlowInstanceId,
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(InboundPlanLineOrmEntity), {
    Id: ids.InboundPlanLineId,
    InboundPlanId: ids.InboundPlanId,
    LineNumber: 1,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    ExpectedQuantity: item.Quantity,
    ExternalLineReference: `${flowReference}-ASN-L1`,
    CreatedAt: now,
  });
  await SaveEntity(manager.getRepository(ReceiptOrmEntity), {
    Id: ids.ReceiptId,
    InboundPlanId: ids.InboundPlanId,
    ReceiptNumber: `RCPT-${flowReference}`,
    BusinessReference: `${flowReference}-RCPT`,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    Status: ReceiptDocumentStatus.Received,
    CoreFlowInstanceId: ids.CoreFlowInstanceId,
    CreatedAt: AddMinutes(now, 2),
    UpdatedAt: AddMinutes(now, 5),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(ReceivingSessionOrmEntity), {
    Id: ids.ReceivingSessionId,
    InboundPlanId: ids.InboundPlanId,
    ReceiptId: ids.ReceiptId,
    SessionKey: `RS-${flowReference}`,
    DeviceCode: 'RF-DEMO-01',
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    Status: ReceivingSessionStatus.Closed,
    StartedAt: AddMinutes(now, 2),
    ClosedAt: AddMinutes(now, 4),
    CreatedAt: AddMinutes(now, 2),
    UpdatedAt: AddMinutes(now, 4),
    StartedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(ReceiptLineOrmEntity), {
    Id: ids.ReceiptLineId,
    ReceiptId: ids.ReceiptId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    LineNumber: 1,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    ExpectedQuantity: item.Quantity,
    ActualQuantity: item.Quantity,
    Status: ReceiptLineStatus.Received,
    ManualConfirm: false,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    ScanEvidenceJson: { lpnCode, barcode: sku.SkuCode, scenario: item.ScenarioCode },
    DiscrepancySignals: [],
    IdempotencyKey: `${flowReference}-receipt-line`,
    ReceivedAt: AddMinutes(now, 4),
    ReceivedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 4),
    UpdatedAt: AddMinutes(now, 4),
  });
  await SaveEntity(manager.getRepository(QcTaskOrmEntity), {
    Id: ids.QcTaskId,
    ReceiptId: ids.ReceiptId,
    ReceiptLineId: ids.ReceiptLineId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    ActualQuantity: item.Quantity,
    TaskStatus: QcTaskStatus.Closed,
    Required: true,
    TriggerReason: 'DEMO_QC_REQUIRED',
    TriggerPolicyJson: { demo: true },
    InventoryStatusCode: 'PENDING_QC',
    TargetInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${flowReference}:qc-task`],
    IdempotencyKey: `${flowReference}-qc-task`,
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 5),
    UpdatedAt: AddMinutes(now, 6),
  });
  await SaveEntity(manager.getRepository(QcResultOrmEntity), {
    Id: ids.QcResultId,
    QcTaskId: ids.QcTaskId,
    ReceiptId: ids.ReceiptId,
    ReceiptLineId: ids.ReceiptLineId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    ResultStatus: QcResultStatus.Passed,
    DispositionCode: QcDispositionCode.Release,
    InspectedQuantity: item.Quantity,
    AcceptedQuantity: item.Quantity,
    RejectedQuantity: 0,
    AcceptedInventoryStatusCode: 'READY_FOR_PUTAWAY',
    RejectedInventoryStatusCode: null,
    TargetInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${flowReference}:qc-result`],
    EvidenceJson: { inspector: 'demo-qc', scenario: item.ScenarioCode },
    IdempotencyKey: `${flowReference}-qc-result`,
    RecordedAt: AddMinutes(now, 6),
    RecordedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 6),
    UpdatedAt: AddMinutes(now, 6),
  });
  await SaveEntity(manager.getRepository(InboundLpnOrmEntity), {
    Id: ids.InboundLpnId,
    ReceiptId: ids.ReceiptId,
    ReceiptLineId: ids.ReceiptLineId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    LpnCode: lpnCode,
    SsccCode: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${flowReference}:lpn`],
    IdempotencyKey: `${flowReference}-lpn`,
    ConfirmedAt: AddMinutes(now, 7),
    ConfirmedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 7),
    UpdatedAt: AddMinutes(now, 7),
  });
  await SaveEntity(manager.getRepository(InboundPutawayReleaseOrmEntity), {
    Id: ids.InboundPutawayReleaseId,
    InboundLpnId: ids.InboundLpnId,
    ReceiptId: ids.ReceiptId,
    ReceiptLineId: ids.ReceiptLineId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    LpnCode: lpnCode,
    SsccCode: null,
    InventoryStatusCode: 'READY_FOR_PUTAWAY',
    // IFB-13: inboundLocation was already resolved above (line 658) -- discarding its Id here was
    // the exact same bug this story fixes in the application code, reproduced in seed data.
    CurrentLocationId: inboundLocation.Id,
    CurrentLocationCode: item.InboundLocationCode,
    WarehouseProfileId: context.WarehouseProfile.Id,
    LabelDecision: 'Allowed',
    LabelReason: 'Demo label already available',
    MatchedPrintJobId: null,
    ConstraintJson: { demo: true },
    OutboxMessageId: null,
    CoreFlowMilestoneId: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${flowReference}:putaway-release`],
    IdempotencyKey: `${flowReference}-putaway-release`,
    ReleasedAt: AddMinutes(now, 8),
    ReleasedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 8),
    UpdatedAt: AddMinutes(now, 8),
  });
};

const SeedOperationalInventory = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  sku: SkuOrmEntity,
  readyStatus: InventoryStatusOrmEntity,
  availableStatus: InventoryStatusOrmEntity,
  loadedStatus: InventoryStatusOrmEntity,
  now: Date,
  input: {
    inboundLocation: LocationOrmEntity;
    putawayLocation: LocationOrmEntity;
    dockLocation: LocationOrmEntity;
    lpnCode: string;
    lotNumber: string;
    expiryDate: string;
  },
): Promise<void> => {
  await SeedDimensionBalance(
    manager,
    ids.PutawaySourceDimensionId,
    ids.PutawaySourceBalanceId,
    context,
    sku,
    readyStatus,
    {
      Location: input.inboundLocation,
      Uom: context.Uom,
      LpnCode: input.lpnCode,
      LotNumber: input.lotNumber,
      ExpiryDate: input.expiryDate,
      QtyOnHand: 0,
      QtyReserved: 0,
      ReferenceId: `${item.FlowReference}:putaway-source`,
    },
  );
  await SeedDimensionBalance(
    manager,
    ids.PutawayDestinationDimensionId,
    ids.PutawayDestinationBalanceId,
    context,
    sku,
    availableStatus,
    {
      Location: input.putawayLocation,
      Uom: context.Uom,
      LpnCode: input.lpnCode,
      LotNumber: input.lotNumber,
      ExpiryDate: input.expiryDate,
      QtyOnHand: item.Quantity,
      QtyReserved: 0,
      ReferenceId: `${item.FlowReference}:putaway-destination`,
    },
  );
  await SeedDimensionBalance(manager, ids.LoadedDimensionId, ids.LoadedBalanceId, context, sku, loadedStatus, {
    Location: input.dockLocation,
    Uom: context.Uom,
    LpnCode: input.lpnCode,
    LotNumber: input.lotNumber,
    ExpiryDate: input.expiryDate,
    QtyOnHand: 0,
    QtyReserved: 0,
    ReferenceId: `${item.FlowReference}:loaded`,
  });
  await SaveEntity(manager.getRepository(PutawayTaskOrmEntity), {
    Id: ids.PutawayTaskId,
    TaskCode: `PA-${item.FlowReference}`,
    TaskStatus: PutawayTaskStatus.Confirmed,
    InboundPutawayReleaseId: ids.InboundPutawayReleaseId,
    ReceiptId: ids.ReceiptId,
    ReceiptLineId: ids.ReceiptLineId,
    InboundPlanId: ids.InboundPlanId,
    InboundPlanLineId: ids.InboundPlanLineId,
    InboundLpnId: ids.InboundLpnId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    LpnCode: input.lpnCode,
    SsccCode: null,
    InventoryStatusCode: 'READY_FOR_PUTAWAY',
    SourceLocationId: input.inboundLocation.Id,
    SourceLocationCode: input.inboundLocation.LocationCode,
    TargetLocationId: input.putawayLocation.Id,
    TargetLocationCode: input.putawayLocation.LocationCode,
    TargetLocationProfileId: input.putawayLocation.LocationProfileId,
    Priority: 30,
    WorkPoolCode: 'LTA-DEMO-PUTAWAY',
    AssignedUserId: null,
    ConstraintJson: { demo: true },
    EligibilityDecisionJson: { eligible: true, rule: 'demo-seed' },
    OutboxMessageId: null,
    MobileTaskId: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${item.FlowReference}:putaway-task`],
    IdempotencyKey: `${item.FlowReference}-putaway-task`,
    ReleasedAt: AddMinutes(now, 9),
    ReleasedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 9),
    UpdatedAt: AddMinutes(now, 10),
  });
  await SaveEntity(manager.getRepository(InventoryTransactionOrmEntity), {
    Id: ids.PutawayTransactionId,
    TransactionCode: `TX-${item.FlowReference}-PUTAWAY`,
    TransactionType: InventoryTransactionType.PutawayConfirm,
    TransactionStatus: InventoryTransactionStatus.Posted,
    PutawayTaskId: ids.PutawayTaskId,
    PutawayTaskCode: `PA-${item.FlowReference}`,
    InventoryMovementId: ids.PutawayMovementId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    FromInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ToInventoryStatusCode: 'AVAILABLE',
    FromLocationId: input.inboundLocation.Id,
    FromLocationCode: input.inboundLocation.LocationCode,
    ToLocationId: input.putawayLocation.Id,
    ToLocationCode: input.putawayLocation.LocationCode,
    LpnCode: input.lpnCode,
    SsccCode: null,
    IdempotencyKey: `${item.FlowReference}-putaway-tx`,
    OutboxMessageId: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${item.FlowReference}:putaway-transaction`],
    PostedAt: AddMinutes(now, 10),
    PostedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 10),
    UpdatedAt: AddMinutes(now, 10),
  });
  await SaveEntity(manager.getRepository(InventoryMovementOrmEntity), {
    Id: ids.PutawayMovementId,
    MovementCode: `MV-${item.FlowReference}-PUTAWAY`,
    MovementStatus: InventoryMovementStatus.Posted,
    InventoryTransactionId: ids.PutawayTransactionId,
    PutawayTaskId: ids.PutawayTaskId,
    PutawayTaskCode: `PA-${item.FlowReference}`,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    FromDimensionId: ids.PutawaySourceDimensionId,
    FromBalanceId: ids.PutawaySourceBalanceId,
    FromLocationId: input.inboundLocation.Id,
    FromLocationCode: input.inboundLocation.LocationCode,
    FromInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ToDimensionId: ids.PutawayDestinationDimensionId,
    ToBalanceId: ids.PutawayDestinationBalanceId,
    ToLocationId: input.putawayLocation.Id,
    ToLocationCode: input.putawayLocation.LocationCode,
    ToInventoryStatusCode: 'AVAILABLE',
    LpnCode: input.lpnCode,
    SsccCode: null,
    ScanEvidenceJson: { scan: 'demo-putaway', scenario: item.ScenarioCode },
    CreatedAt: AddMinutes(now, 10),
    CreatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(InventoryTransactionOrmEntity), {
    Id: ids.GoodsIssueTransactionId,
    TransactionCode: `TX-${item.FlowReference}-GI`,
    TransactionType: InventoryTransactionType.GoodsIssue,
    TransactionStatus: InventoryTransactionStatus.Posted,
    PutawayTaskId: null,
    PutawayTaskCode: null,
    InventoryMovementId: ids.GoodsIssueMovementId,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    FromInventoryStatusCode: 'LOADED',
    ToInventoryStatusCode: 'LOADED',
    FromLocationId: input.dockLocation.Id,
    FromLocationCode: input.dockLocation.LocationCode,
    ToLocationId: input.dockLocation.Id,
    ToLocationCode: input.dockLocation.LocationCode,
    LpnCode: input.lpnCode,
    SsccCode: null,
    IdempotencyKey: `${item.FlowReference}-goods-issue`,
    OutboxMessageId: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${item.FlowReference}:goods-issue-transaction`],
    PostedAt: AddMinutes(now, 24),
    PostedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 24),
    UpdatedAt: AddMinutes(now, 24),
  });
  await SaveEntity(manager.getRepository(InventoryMovementOrmEntity), {
    Id: ids.GoodsIssueMovementId,
    MovementCode: `MV-${item.FlowReference}-GI`,
    MovementStatus: InventoryMovementStatus.Posted,
    InventoryTransactionId: ids.GoodsIssueTransactionId,
    PutawayTaskId: null,
    PutawayTaskCode: null,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    FromDimensionId: ids.LoadedDimensionId,
    FromBalanceId: ids.LoadedBalanceId,
    FromLocationId: input.dockLocation.Id,
    FromLocationCode: input.dockLocation.LocationCode,
    FromInventoryStatusCode: 'LOADED',
    ToDimensionId: ids.LoadedDimensionId,
    ToBalanceId: ids.LoadedBalanceId,
    ToLocationId: input.dockLocation.Id,
    ToLocationCode: input.dockLocation.LocationCode,
    ToInventoryStatusCode: 'LOADED',
    LpnCode: input.lpnCode,
    SsccCode: null,
    ScanEvidenceJson: { scan: 'demo-goods-issue', scenario: item.ScenarioCode },
    CreatedAt: AddMinutes(now, 24),
    CreatedBy: context.ActorId,
  });
};

const SeedDimensionBalance = async (
  manager: EntityManager,
  dimensionId: string,
  balanceId: string,
  context: DemoDataCcFlowContext,
  sku: SkuOrmEntity,
  status: InventoryStatusOrmEntity,
  input: {
    Location: LocationOrmEntity;
    Uom: UomOrmEntity;
    LpnCode: string;
    LotNumber: string;
    ExpiryDate: string;
    QtyOnHand: number;
    QtyReserved: number;
    ReferenceId: string;
  },
): Promise<void> => {
  await SaveEntity(manager.getRepository(InventoryDimensionOrmEntity), {
    Id: dimensionId,
    OwnerId: context.Owner.Id,
    SkuId: sku.Id,
    WarehouseId: context.Warehouse.Id,
    LocationId: input.Location.Id,
    InventoryStatusId: status.Id,
    DimensionKeyHash: BuildDemoDataCcInventoryDimensionHash({
      OwnerId: context.Owner.Id,
      SkuId: sku.Id,
      WarehouseId: context.Warehouse.Id,
      LocationId: input.Location.Id,
      InventoryStatusId: status.Id,
      UomId: input.Uom.Id,
      LpnCode: input.LpnCode,
      LotNumber: input.LotNumber,
      ExpiryDate: input.ExpiryDate,
    }),
    UomId: input.Uom.Id,
    LpnCode: input.LpnCode,
    LotNumber: input.LotNumber,
    ExpiryDate: new Date(`${input.ExpiryDate}T00:00:00.000Z`),
    SerialNumber: null,
    ProductionDate: new Date('2025-09-01T00:00:00.000Z'),
    CountryOfOrigin: 'VN',
    CustomsStatus: 'DOMESTIC',
    SourceSystem: DemoSourceSystem,
    ReferenceId: input.ReferenceId,
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(InventoryBalanceOrmEntity), {
    Id: balanceId,
    DimensionId: dimensionId,
    QtyOnHand: input.QtyOnHand,
    QtyReserved: input.QtyReserved,
    QtyAvailable: input.QtyOnHand - input.QtyReserved,
    SourceSystem: DemoSourceSystem,
    ReferenceId: input.ReferenceId,
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
};

const SeedOutbound = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  sku: SkuOrmEntity,
  sourceLocation: LocationOrmEntity,
  now: Date,
  input: {
    flowReference: string;
    lpnCode: string;
    lotNumber: string;
    expiryDate: string;
  },
): Promise<void> => {
  await SaveEntity(manager.getRepository(OutboundOrderOrmEntity), {
    Id: ids.OutboundOrderId,
    OrderNumber: `OO-${input.flowReference}`,
    SourceSystem: DemoSourceSystem,
    SourceReference: `${input.flowReference}-SO`,
    BusinessReference: `${input.flowReference}-OUT`,
    CustomerId: context.Customer.Id,
    CustomerSourceSystem: DemoSourceSystem,
    CustomerExternalReference: context.Customer.ExternalReference,
    CustomerCode: context.Customer.PartnerCode,
    ShipToReference: `${input.flowReference}-SHIP-TO`,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    Priority: 1,
    CutoffAt: AddMinutes(now, 60),
    DocumentStatus: OutboundOrderStatus.Validated,
    ValidationErrors: [],
    CoreFlowInstanceId: ids.CoreFlowInstanceId,
    OutboxMessageId: null,
    ImportIdempotencyKey: `${input.flowReference}-outbound-import`,
    ImportPayloadFingerprint: Hash(`${input.flowReference}-outbound`),
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${input.flowReference}:outbound-order`],
    ActionIdempotency: {},
    CreatedAt: AddMinutes(now, 12),
    UpdatedAt: AddMinutes(now, 12),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(OutboundOrderLineOrmEntity), {
    Id: ids.OutboundOrderLineId,
    OutboundOrderId: ids.OutboundOrderId,
    LineNumber: 1,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    OrderedQuantity: item.Quantity,
    ExternalLineReference: `${input.flowReference}-SO-L1`,
    ValidationErrors: [],
    CreatedAt: AddMinutes(now, 12),
  });
  await SaveEntity(manager.getRepository(AllocationOrmEntity), {
    Id: ids.AllocationId,
    AllocationNumber: `AL-${input.flowReference}`,
    OutboundOrderId: ids.OutboundOrderId,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    Policy: AllocationPolicy.FullOnly,
    Status: AllocationStatus.Allocated,
    TotalOrderedQuantity: item.Quantity,
    TotalAllocatedQuantity: item.Quantity,
    TotalBackorderedQuantity: 0,
    ShortageReason: null,
    OutboxMessageId: null,
    IdempotencyKey: `${input.flowReference}-allocation`,
    PayloadFingerprint: Hash(`${input.flowReference}-allocation`),
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${input.flowReference}:allocation`],
    CreatedAt: AddMinutes(now, 13),
    UpdatedAt: AddMinutes(now, 13),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(AllocationLineOrmEntity), {
    Id: ids.AllocationLineId,
    AllocationId: ids.AllocationId,
    OutboundOrderLineId: ids.OutboundOrderLineId,
    LineNumber: 1,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    OrderedQuantity: item.Quantity,
    AllocatedQuantity: item.Quantity,
    BackorderedQuantity: 0,
    SourceBalanceId: ids.PutawayDestinationBalanceId,
    SourceDimensionId: ids.PutawayDestinationDimensionId,
    SourceLocationId: sourceLocation.Id,
    InventoryStatusCode: 'AVAILABLE',
    LotNumber: input.lotNumber,
    SerialNumber: null,
    ExpiryDate: new Date(`${input.expiryDate}T00:00:00.000Z`),
    Status: AllocationStatus.Allocated,
    ShortageReason: null,
    CreatedAt: AddMinutes(now, 13),
  });
  await SaveEntity(manager.getRepository(PickReleaseOrmEntity), {
    Id: ids.PickReleaseId,
    ReleaseNumber: `PR-${input.flowReference}`,
    OutboundOrderId: ids.OutboundOrderId,
    AllocationId: ids.AllocationId,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    ReleaseMode: PickReleaseMode.Discrete,
    BatchSize: 50,
    Status: PickReleaseStatus.Released,
    BlockReason: null,
    TotalTaskCount: 1,
    TotalReleasedQuantity: item.Quantity,
    OutboxMessageId: null,
    IdempotencyKey: `${input.flowReference}-pick-release`,
    PayloadFingerprint: Hash(`${input.flowReference}-pick-release`),
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${input.flowReference}:pick-release`],
    CreatedAt: AddMinutes(now, 14),
    UpdatedAt: AddMinutes(now, 14),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(PickTaskOrmEntity), {
    Id: ids.PickTaskId,
    PickReleaseId: ids.PickReleaseId,
    OutboundOrderId: ids.OutboundOrderId,
    AllocationId: ids.AllocationId,
    AllocationLineId: ids.AllocationLineId,
    OutboundOrderLineId: ids.OutboundOrderLineId,
    TaskNumber: `PT-${input.flowReference}`,
    Status: PickTaskStatus.Completed,
    Sequence: 1,
    BatchNumber: null,
    SourceBalanceId: ids.PutawayDestinationBalanceId,
    SourceDimensionId: ids.PutawayDestinationDimensionId,
    SourceLocationId: sourceLocation.Id,
    TargetLocationId: null,
    TargetReference: `${input.flowReference}-PACK`,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    InventoryStatusCode: 'AVAILABLE',
    LotNumber: input.lotNumber,
    SerialNumber: null,
    ExpiryDate: new Date(`${input.expiryDate}T00:00:00.000Z`),
    CompletedAt: AddMinutes(now, 15),
    CompletedBy: context.ActorId,
    ConfirmIdempotencyKey: `${input.flowReference}-pick-confirm`,
    ConfirmPayloadFingerprint: Hash(`${input.flowReference}-pick-confirm`),
    ConfirmOutboxMessageId: null,
    ConfirmInventoryTransactionId: null,
    ConfirmResultJson: { scenario: item.ScenarioCode, lpnCode: input.lpnCode },
    ExceptionType: null,
    ExceptionCaseId: null,
    ExceptionReasonCode: null,
    ExceptionReasonCodeId: null,
    ExceptionReasonNote: null,
    ExceptionEvidenceJson: null,
    ExceptionIdempotencyKey: null,
    ExceptionPayloadFingerprint: null,
    ExceptionReportedAt: null,
    ExceptionReportedBy: null,
    ReplenishmentRequired: false,
    ReplenishmentTaskId: null,
    SubstitutionStatus: null,
    SubstitutionSkuId: null,
    SubstitutionSkuCode: null,
    SubstitutionUomId: null,
    SubstitutionUomCode: null,
    SubstitutionQuantity: null,
    SubstitutionApprovalRequestId: null,
    SubstitutionPolicyJson: null,
    SubstitutionIdempotencyKey: null,
    SubstitutionPayloadFingerprint: null,
    SubstitutionRequestedAt: null,
    SubstitutionRequestedBy: null,
    CreatedAt: AddMinutes(now, 14),
  });
  await SaveEntity(manager.getRepository(PackSessionOrmEntity), {
    Id: ids.PackSessionId,
    SessionNumber: `PS-${input.flowReference}`,
    PickTaskId: ids.PickTaskId,
    MobileTaskId: null,
    OutboundOrderId: ids.OutboundOrderId,
    WarehouseProfileId: context.WarehouseProfile.Id,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    Status: PackSessionStatus.CheckingPassed,
    CheckRequired: true,
    CheckResult: PackageCheckResult.Passed,
    CheckExceptionCaseId: null,
    CheckReasonCode: null,
    CheckReasonCodeId: null,
    CheckReasonNote: null,
    CheckEvidenceRefs: [
      `${input.flowReference}:pack-check`,
      `container:${item.ContainerNumber}`,
      `seal:${item.SealNumber}`,
    ],
    CheckPayloadJson: {
      scenario: item.ScenarioCode,
      containerNumber: item.ContainerNumber,
      sealNumber: item.SealNumber,
    },
    CheckIdempotencyKey: `${input.flowReference}-pack-check`,
    CheckPayloadFingerprint: Hash(`${input.flowReference}-pack-check`),
    StartedAt: AddMinutes(now, 16),
    StartedBy: context.ActorId,
    CheckedAt: AddMinutes(now, 17),
    CheckedBy: context.ActorId,
    IdempotencyKey: `${input.flowReference}-pack-session`,
    PayloadFingerprint: Hash(`${input.flowReference}-pack-session`),
    CreatedAt: AddMinutes(now, 16),
    UpdatedAt: AddMinutes(now, 17),
  });
  await SaveEntity(manager.getRepository(PackageOrmEntity), {
    Id: ids.PackageId,
    PackageCode: `PKG-${input.flowReference}`,
    PackSessionId: ids.PackSessionId,
    PickTaskId: ids.PickTaskId,
    OutboundOrderId: ids.OutboundOrderId,
    WarehouseProfileId: context.WarehouseProfile.Id,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    Status: PackageStatus.ReadyForStaging,
    CheckRequired: true,
    CheckResult: PackageCheckResult.Passed,
    CartonType: 'BOX',
    Weight: item.Quantity * 10,
    Length: 60,
    Width: 40,
    Height: 35,
    LabelBlockingDecision: 'Allowed',
    LabelPrintJobId: null,
    LabelPrintJobCode: null,
    ReadyForStagingIdempotencyKey: `${input.flowReference}-ready-staging`,
    ReadyForStagingPayloadFingerprint: Hash(`${input.flowReference}-ready-staging`),
    CloseIdempotencyKey: `${input.flowReference}-package-close`,
    ClosePayloadFingerprint: Hash(`${input.flowReference}-package-close`),
    ClosedAt: AddMinutes(now, 18),
    ClosedBy: context.ActorId,
    ReadyForStagingAt: AddMinutes(now, 18),
    ReadyForStagingBy: context.ActorId,
    IdempotencyKey: `${input.flowReference}-package`,
    PayloadFingerprint: Hash(`${input.flowReference}-package`),
    CreatedAt: AddMinutes(now, 17),
    UpdatedAt: AddMinutes(now, 18),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(PackageContentOrmEntity), {
    Id: ids.PackageContentId,
    PackageId: ids.PackageId,
    PickTaskId: ids.PickTaskId,
    OutboundOrderLineId: ids.OutboundOrderLineId,
    SourceBalanceId: ids.PutawayDestinationBalanceId,
    SourceDimensionId: ids.PutawayDestinationDimensionId,
    SkuId: sku.Id,
    SkuCode: sku.SkuCode,
    UomId: context.Uom.Id,
    UomCode: context.Uom.UomCode,
    Quantity: item.Quantity,
    InventoryStatusCode: 'PICKED',
    LotNumber: input.lotNumber,
    SerialNumber: null,
    ExpiryDate: new Date(`${input.expiryDate}T00:00:00.000Z`),
    CreatedAt: AddMinutes(now, 17),
  });
};

const SeedShipping = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  packLocation: LocationOrmEntity,
  dockLocation: LocationOrmEntity,
  now: Date,
  eventIds: ReturnType<typeof BuildOutboxIds>,
): Promise<void> => {
  await SaveEntity(manager.getRepository(ShipmentPackageStagingOrmEntity), {
    Id: ids.ShipmentStagingId,
    StagingCode: `STG-${item.FlowReference}`,
    PackageId: ids.PackageId,
    PackageCode: `PKG-${item.FlowReference}`,
    OutboundOrderId: ids.OutboundOrderId,
    WarehouseProfileId: context.WarehouseProfile.Id,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    Status: ShipmentPackageStagingStatus.GateOutRecorded,
    InventoryStatusCode: 'LOADED',
    ShipmentReference: item.ShipmentReference,
    StagingLaneCode: packLocation.LocationCode,
    StagingLocationId: packLocation.Id,
    StagingLocationCode: packLocation.LocationCode,
    DockDoorId: dockLocation.Id,
    DockDoorCode: dockLocation.LocationCode,
    TruckReference: item.TruckReference,
    VehicleNumber: item.VehicleNumber,
    DriverName: 'Tài xế giao hàng demo',
    CarrierId: context.Carrier.Id,
    CarrierCode: context.Carrier.PartnerCode,
    CoreFlowInstanceId: ids.CoreFlowInstanceId,
    StageIdempotencyKey: `${item.FlowReference}-stage`,
    StagePayloadFingerprint: Hash(`${item.FlowReference}-stage`),
    DockIdempotencyKey: `${item.FlowReference}-dock`,
    DockPayloadFingerprint: Hash(`${item.FlowReference}-dock`),
    TruckIdempotencyKey: `${item.FlowReference}-truck`,
    TruckPayloadFingerprint: Hash(`${item.FlowReference}-truck`),
    LoadingIdempotencyKey: `${item.FlowReference}-loading`,
    LoadingPayloadFingerprint: Hash(`${item.FlowReference}-loading`),
    ShipmentConfirmIdempotencyKey: `${item.FlowReference}-shipment-confirm`,
    ShipmentConfirmPayloadFingerprint: Hash(`${item.FlowReference}-shipment-confirm`),
    GateOutIdempotencyKey: `${item.FlowReference}-gate-out`,
    GateOutPayloadFingerprint: Hash(`${item.FlowReference}-gate-out`),
    GoodsIssueTriggerIdempotencyKey: `${item.FlowReference}-gi-trigger`,
    GoodsIssueTriggerPayloadFingerprint: Hash(`${item.FlowReference}-gi-trigger`),
    GoodsIssueIdempotencyKey: `${item.FlowReference}-gi`,
    GoodsIssuePayloadFingerprint: Hash(`${item.FlowReference}-gi`),
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: BuildDemoDataCcFlowShippingEvidenceRefs(item),
    StagedAt: AddMinutes(now, 19),
    StagedBy: context.ActorId,
    DockAssignedAt: AddMinutes(now, 20),
    DockAssignedBy: context.ActorId,
    TruckAssignedAt: AddMinutes(now, 20),
    TruckAssignedBy: context.ActorId,
    LoadReference: item.LoadReference,
    LoadedAt: AddMinutes(now, 21),
    LoadedBy: context.ActorId,
    ShipmentConfirmedAt: AddMinutes(now, 22),
    ShipmentConfirmedBy: context.ActorId,
    GateOutReference: item.GateOutReference,
    GateOutAt: AddMinutes(now, 23),
    GateOutBy: context.ActorId,
    GoodsIssueTrigger: item.GoodsIssueTrigger,
    GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Ready,
    GoodsIssueTriggeredAt: AddMinutes(now, 23),
    GoodsIssueTriggeredBy: context.ActorId,
    GoodsIssueStatus: GoodsIssueStatus.Posted,
    GoodsIssuePostedAt: AddMinutes(now, 24),
    GoodsIssuePostedBy: context.ActorId,
    GoodsIssueInventoryTransactionId: ids.GoodsIssueTransactionId,
    GoodsIssueInventoryMovementId: ids.GoodsIssueMovementId,
    LoadingOutboxMessageId: eventIds.LoadingConfirmed,
    ShipmentConfirmOutboxMessageId: null,
    GateOutOutboxMessageId: null,
    GoodsIssueTriggerOutboxMessageId: null,
    GoodsIssueOutboxMessageId: eventIds.GoodsIssuePosted,
    ShipmentClosedOutboxMessageId: null,
    ShipmentClosedAt: AddMinutes(now, 25),
    CreatedAt: AddMinutes(now, 19),
    UpdatedAt: AddMinutes(now, 25),
    CreatedBy: context.ActorId,
    UpdatedBy: context.ActorId,
  });
};

const SeedIntegration = async (
  manager: EntityManager,
  ids: ScenarioIds,
  context: DemoDataCcFlowContext,
  item: DemoDataCcFlowScenario,
  now: Date,
  eventIds: ReturnType<typeof BuildOutboxIds>,
  uomCode: string,
): Promise<void> => {
  await SaveEntity(manager.getRepository(ImportBatchOrmEntity), {
    Id: ids.ImportBatchId,
    BatchReference: `${item.FlowReference}-IMPORT`,
    SourceSystem: DemoSourceSystem,
    TargetSystem: 'LTA-WMS',
    Status: ImportBatchStatus.Completed,
    MessageCount: 1,
    AcceptedCount: 1,
    DuplicateCount: 0,
    RejectedCount: 0,
    CreatedAt: now,
    CreatedBy: context.ActorId,
  });
  await SaveEntity(manager.getRepository(InterfaceMessageOrmEntity), {
    Id: ids.InterfaceMessageId,
    ImportBatchId: ids.ImportBatchId,
    MessageId: `${item.FlowReference}-IF-INBOUND`,
    MessageType: 'InboundPlanImported',
    Version: '1.0',
    BusinessReference: item.FlowReference,
    SourceSystem: DemoSourceSystem,
    TargetSystem: 'LTA-WMS',
    WarehouseContext: context.Warehouse.WarehouseCode,
    OwnerContext: context.Owner.OwnerCode,
    EventTime: now,
    CorrelationId: `${item.FlowReference}-corr`,
    CausationId: `${item.FlowReference}-cause`,
    Payload: {
      InboundPlanId: ids.InboundPlanId,
      ScenarioCode: item.ScenarioCode,
      Quantity: item.Quantity,
      UomCode: uomCode,
    },
    MessageStatus: InterfaceMessageStatus.Accepted,
    CreatedAt: now,
    CreatedBy: context.ActorId,
  });

  const events = [
    ['InboundImported', eventIds.InboundImported, ids.InboundPlanId],
    ['PutawayConfirmed', eventIds.PutawayConfirmed, ids.PutawayTaskId],
    ['OutboundOrderImported', eventIds.OutboundImported, ids.OutboundOrderId],
    ['AllocationCompleted', eventIds.AllocationCompleted, ids.AllocationId],
    ['PickConfirmed', eventIds.PickConfirmed, ids.PickTaskId],
    ['PackagePacked', eventIds.PackagePacked, ids.PackageId],
    ['LoadingConfirmed', eventIds.LoadingConfirmed, ids.ShipmentStagingId],
    ['GoodsIssuePosted', eventIds.GoodsIssuePosted, ids.GoodsIssueTransactionId],
  ] as const;

  for (const [eventType, id, sourceId] of events) {
    const eventTime = GetDemoDataCcFlowOutboxEventTime(now, eventType);

    await SaveEntity(manager.getRepository(OutboxMessageOrmEntity), {
      Id: id,
      SourceMessageId: null,
      MessageId: `${item.FlowReference}-${eventType}`,
      EventType: eventType,
      Version: '1.0',
      BusinessReference: item.FlowReference,
      SourceSystem: DemoSourceSystem,
      TargetSystem: 'ERP-TMS-DEMO',
      WarehouseContext: context.Warehouse.WarehouseCode,
      OwnerContext: context.Owner.OwnerCode,
      EventTime: eventTime,
      CorrelationId: `${item.FlowReference}-corr`,
      CausationId: `${item.FlowReference}-${eventType}-cause`,
      Payload: BuildDemoDataCcFlowOutboxPayload({
        EventType: eventType,
        Scenario: item,
        SourceId: sourceId,
        UomCode: uomCode,
      }),
      Status: OutboxMessageStatus.Pending,
      AttemptCount: 0,
      MaxAttempts: 5,
      NextRetryAt: null,
      LastError: null,
      FailureCategory: null,
      DeadLetterReason: null,
      DeadLetteredAt: null,
      ResolutionAction: null,
      ActionIdempotencyKey: null,
      ActionPayloadHash: null,
      ResolvedAt: null,
      ResolvedBy: null,
      ReasonCode: null,
      ReasonCodeId: null,
      ReasonNote: null,
      EvidenceRefs: BuildDemoDataCcFlowOutboxEvidenceRefs({
        EventType: eventType,
        Scenario: item,
      }),
      CreatedAt: eventTime,
      CreatedBy: context.ActorId,
      UpdatedAt: eventTime,
    });
  }

  await SaveEntity(manager.getRepository(IntegrationReconciliationRunOrmEntity), {
    Id: ids.ReconciliationRunId,
    BusinessReference: item.FlowReference,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    RunStatus: IntegrationReconciliationRunStatus.Completed,
    SourceCounts: {
      InterfaceMessages: 1,
      OutboxMessages: events.length,
      Shipments: 1,
      GoodsIssues: 1,
    },
    ItemCount: 1,
    MismatchCount: 0,
    ExceptionCount: 0,
    IdempotencyKey: `${item.FlowReference}-reconciliation`,
    RequestPayloadHash: Hash(`${item.FlowReference}-reconciliation`),
    ReasonCode: 'DEMO_ACCEPTANCE',
    ReasonCodeId: null,
    ReasonNote: 'Reconciliation demo seed không phát hiện mismatch.',
    EvidenceRefs: [`${item.FlowReference}:reconciliation`],
    ResolvedAt: null,
    ResolvedBy: null,
    CreatedAt: AddMinutes(now, 26),
    CreatedBy: context.ActorId,
    UpdatedAt: AddMinutes(now, 26),
  });
  await SaveEntity(manager.getRepository(IntegrationReconciliationItemOrmEntity), {
    Id: ids.ReconciliationItemId,
    RunId: ids.ReconciliationRunId,
    ItemStatus: IntegrationReconciliationItemStatus.Resolved,
    Severity: IntegrationReconciliationSeverity.Low,
    MismatchType: 'None',
    SourceType: 'DemoFlow',
    SourceId: item.FlowReference,
    ExpectedSummary: { outboxMessages: events.length, goodsIssue: GoodsIssueStatus.Posted },
    ActualSummary: { outboxMessages: events.length, goodsIssue: GoodsIssueStatus.Posted },
    ExceptionCaseId: null,
    OutboxMessageId: eventIds.GoodsIssuePosted,
    DeadLetterMessageId: null,
    ResolutionNote: 'Demo flow reconciliation matched.',
    ResolutionIdempotencyKey: `${item.FlowReference}-reconciliation-item`,
    ResolutionPayloadHash: Hash(`${item.FlowReference}-reconciliation-item`),
    ApprovalRequestId: null,
    ReasonCode: 'DEMO_ACCEPTANCE',
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [`${item.FlowReference}:reconciliation-item`],
    ResolvedAt: AddMinutes(now, 26),
    ResolvedBy: context.ActorId,
    CreatedAt: AddMinutes(now, 26),
    UpdatedAt: AddMinutes(now, 26),
  });
};

const RequiredMapValue = <T>(map: Map<string, T>, key: string): T => {
  const value = map.get(key);
  if (!value) {
    throw new Error(`DEMO-DATA-LTA flow seed missing map value ${key}.`);
  }

  return value;
};

const SaveEntity = async <T extends object>(repo: Repository<T>, entity: DeepPartial<T>): Promise<T> =>
  await repo.save(repo.create(entity));

const AddMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60 * 1000);

const DemoDataCcFlowOutboxEventMinuteByType: Record<DemoDataCcFlowOutboxEventType, number> = {
  InboundImported: 0,
  PutawayConfirmed: 8,
  OutboundOrderImported: 12,
  AllocationCompleted: 13,
  PickConfirmed: 15,
  PackagePacked: 17,
  LoadingConfirmed: 21,
  GoodsIssuePosted: 24,
};

export const GetDemoDataCcFlowOutboxEventTime = (date: Date, eventType: DemoDataCcFlowOutboxEventType): Date => {
  if (!DemoDataCcFlowOutboxEventTypes.includes(eventType)) {
    throw new Error(`Unsupported demo-data outbox event: ${eventType as string}.`);
  }

  return AddMinutes(date, DemoDataCcFlowOutboxEventMinuteByType[eventType]);
};

const Hash = (value: string): string => createHash('sha256').update(value).digest('hex');
