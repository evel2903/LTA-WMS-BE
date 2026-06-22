import { randomUUID } from 'crypto';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';

const MASTER_OBJECTS: ObjectType[] = [
  ObjectType.Site,
  ObjectType.Warehouse,
  ObjectType.Zone,
  ObjectType.Location,
  ObjectType.LocationProfile,
  ObjectType.Owner,
  ObjectType.Sku,
  ObjectType.Uom,
  ObjectType.ItemCoverage,
  ObjectType.InventoryStatus,
];

const CONFIG_OBJECTS: ObjectType[] = [ObjectType.WarehouseProfile, ObjectType.Rule];
const V1_DOCUMENT_OBJECTS: ObjectType[] = [
  ObjectType.InboundPlan,
  ObjectType.Receipt,
  ObjectType.OutboundOrder,
  ObjectType.Shipment,
  ObjectType.Load,
  ObjectType.GoodsIssue,
];
const V1_INVENTORY_OBJECTS: ObjectType[] = [
  ObjectType.InventoryMovement,
  ObjectType.CycleCount,
  ObjectType.ReconciliationRun,
];
const V1_LABEL_OBJECTS: ObjectType[] = [ObjectType.LabelTemplate, ObjectType.PrintJob, ObjectType.Package];
const V1_INTEGRATION_OBJECTS: ObjectType[] = [
  ObjectType.IntegrationMessage,
  ObjectType.DeadLetterMessage,
  ObjectType.ReconciliationRun,
];

export type ReasonCodeCatalogEntry = {
  ReasonCode: string;
  ReasonGroup: ReasonGroup;
  Description: string;
  AppliesToActions: ActionCode[];
  AppliesToObjects: ObjectType[];
  EvidenceRequired?: boolean;
  ApprovalRequired?: boolean;
};

/**
 * V0 reason-code catalog. Covers every standard action (create/update/cancel/approve/
 * override/unlock/reprint/adjust/config-change) so audit/override/approval/exception
 * have a valid reason to reference. Business-process reasons arrive with V1+.
 */
export const ReasonCodeCatalogEntries: ReadonlyArray<ReasonCodeCatalogEntry> = [
  {
    ReasonCode: 'RC-MD-CREATE',
    ReasonGroup: ReasonGroup.MasterDataConfigChange,
    Description: 'Create master-data record.',
    AppliesToActions: [ActionCode.Create],
    AppliesToObjects: MASTER_OBJECTS,
  },
  {
    ReasonCode: 'RC-MD-UPDATE',
    ReasonGroup: ReasonGroup.MasterDataConfigChange,
    Description: 'Update master-data record.',
    AppliesToActions: [ActionCode.Update],
    AppliesToObjects: MASTER_OBJECTS,
  },
  {
    ReasonCode: 'RC-CONFIG-CHANGE',
    ReasonGroup: ReasonGroup.MasterDataConfigChange,
    Description: 'Warehouse profile / rule configuration change.',
    AppliesToActions: [ActionCode.Create, ActionCode.Update],
    AppliesToObjects: CONFIG_OBJECTS,
  },
  {
    ReasonCode: 'RC-CANCEL',
    ReasonGroup: ReasonGroup.MasterDataConfigChange,
    Description: 'Cancel or delete a record.',
    AppliesToActions: [ActionCode.DeleteCancel],
    AppliesToObjects: [...MASTER_OBJECTS, ...CONFIG_OBJECTS],
  },
  {
    ReasonCode: 'RC-RULE-OVERRIDE',
    ReasonGroup: ReasonGroup.RuleOverride,
    Description: 'Override a non-compliance rule outcome (needs evidence + approval).',
    AppliesToActions: [ActionCode.Update, ActionCode.Override],
    AppliesToObjects: [ObjectType.Rule, ObjectType.WarehouseProfile],
    EvidenceRequired: true,
    ApprovalRequired: true,
  },
  {
    ReasonCode: 'RC-APPROVE',
    ReasonGroup: ReasonGroup.RuleOverride,
    Description: 'Approve a pending request.',
    AppliesToActions: [ActionCode.Approve],
    AppliesToObjects: [ObjectType.ApprovalRequest, ObjectType.WarehouseProfile],
  },
  {
    ReasonCode: 'RC-UNLOCK',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Unlock a locked record or exception.',
    AppliesToActions: [ActionCode.Unlock],
    AppliesToObjects: [ObjectType.WarehouseProfile, ObjectType.ExceptionCase],
  },
  {
    ReasonCode: 'RC-REPRINT',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Reprint a label or document.',
    AppliesToActions: [ActionCode.Reprint],
    AppliesToObjects: [ObjectType.Sku, ObjectType.InventoryStatus],
  },
  {
    ReasonCode: 'RC-EXC-RESOLVE',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Resolve or close an exception case (manual fix).',
    AppliesToActions: [ActionCode.Update],
    AppliesToObjects: [ObjectType.ExceptionCase],
  },
  {
    ReasonCode: 'RC-ADJUST',
    ReasonGroup: ReasonGroup.InventoryAdjustment,
    Description: 'Inventory quantity / status adjustment (needs evidence).',
    AppliesToActions: [ActionCode.Adjust],
    AppliesToObjects: [ObjectType.InventoryStatus],
    EvidenceRequired: true,
  },
  {
    ReasonCode: 'RC-HOLD-RELEASE',
    ReasonGroup: ReasonGroup.HoldRelease,
    Description: 'Place or release a hold.',
    AppliesToActions: [ActionCode.Update],
    AppliesToObjects: [ObjectType.InventoryStatus],
  },
  {
    ReasonCode: 'RC-INTEGRATION',
    ReasonGroup: ReasonGroup.Integration,
    Description: 'Integration / external system manual fix.',
    AppliesToActions: [ActionCode.Create, ActionCode.Update],
    AppliesToObjects: [ObjectType.Sku, ObjectType.Owner],
  },
  {
    ReasonCode: 'RC-V1-CANCEL',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Cancel a V1 operational document or task.',
    AppliesToActions: [ActionCode.DeleteCancel],
    AppliesToObjects: V1_DOCUMENT_OBJECTS,
  },
  {
    ReasonCode: 'RC-V1-DISCREPANCY',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Record inbound, QC, inventory or outbound discrepancy evidence.',
    AppliesToActions: [ActionCode.Create, ActionCode.Update],
    AppliesToObjects: [
      ObjectType.Receipt,
      ObjectType.QcTask,
      ObjectType.InventoryMovement,
      ObjectType.OutboundOrder,
      ObjectType.Allocation,
      ObjectType.PickTask,
      ObjectType.Package,
    ],
    EvidenceRequired: true,
  },
  {
    ReasonCode: 'RC-V1-HOLD-RELEASE',
    ReasonGroup: ReasonGroup.HoldRelease,
    Description: 'Place or release an operational hold during V1 execution.',
    AppliesToActions: [ActionCode.Update],
    AppliesToObjects: [ObjectType.InventoryMovement, ObjectType.CycleCount, ObjectType.Package, ObjectType.Shipment],
  },
  {
    ReasonCode: 'RC-V1-ADJUSTMENT',
    ReasonGroup: ReasonGroup.InventoryAdjustment,
    Description: 'Adjust V1 movement, count or reconciliation quantities.',
    AppliesToActions: [ActionCode.Adjust],
    AppliesToObjects: V1_INVENTORY_OBJECTS,
    EvidenceRequired: true,
  },
  {
    ReasonCode: 'RC-V1-OVERRIDE',
    ReasonGroup: ReasonGroup.RuleOverride,
    Description: 'Override a V1 task, allocation, routing or posting control.',
    AppliesToActions: [ActionCode.Override],
    AppliesToObjects: [
      ObjectType.Allocation,
      ObjectType.QcTask,
      ObjectType.MobileTask,
      ObjectType.PutawayTask,
      ObjectType.PickTask,
      ObjectType.GoodsIssue,
      ObjectType.IntegrationMessage,
    ],
    EvidenceRequired: true,
    ApprovalRequired: true,
  },
  {
    ReasonCode: 'RC-V1-REPRINT',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Reprint V1 label, package, shipment or loading document.',
    AppliesToActions: [ActionCode.Reprint],
    AppliesToObjects: V1_LABEL_OBJECTS,
  },
  {
    ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
    ReasonGroup: ReasonGroup.Integration,
    Description: 'Manually fix an integration dead-letter or reconciliation record.',
    AppliesToActions: [ActionCode.Update, ActionCode.Override],
    AppliesToObjects: V1_INTEGRATION_OBJECTS,
    EvidenceRequired: true,
  },
  {
    ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
    ReasonGroup: ReasonGroup.InventoryAdjustment,
    Description: 'Correct goods issue, loading or inventory movement posting.',
    AppliesToActions: [ActionCode.Update, ActionCode.Adjust],
    AppliesToObjects: [ObjectType.GoodsIssue, ObjectType.Load, ObjectType.Shipment, ObjectType.InventoryMovement],
    EvidenceRequired: true,
    ApprovalRequired: true,
  },
  {
    ReasonCode: 'RC-V1-HANDOFF',
    ReasonGroup: ReasonGroup.ManualFix,
    Description: 'Record skipped CoreFlow step, blocked handoff or forced handoff evidence.',
    AppliesToActions: [ActionCode.Update, ActionCode.Override],
    AppliesToObjects: [ObjectType.CoreFlow],
    EvidenceRequired: true,
  },
];

/** Idempotent: existing codes (matched by ReasonCode) are skipped, so re-runs never duplicate. */
export async function SeedReasonCodeCatalog(reasonCodeRepository: IReasonCodeRepository): Promise<void> {
  for (const entry of ReasonCodeCatalogEntries) {
    const existing = await reasonCodeRepository.FindByCode(entry.ReasonCode);
    if (existing) continue;
    const now = new Date();
    await reasonCodeRepository.Create(
      new ReasonCodeEntity({
        Id: randomUUID(),
        ReasonCode: entry.ReasonCode,
        ReasonGroup: entry.ReasonGroup,
        Description: entry.Description,
        AppliesToActions: entry.AppliesToActions,
        AppliesToObjects: entry.AppliesToObjects,
        EvidenceRequired: entry.EvidenceRequired ?? false,
        ApprovalRequired: entry.ApprovalRequired ?? false,
        AllowedRoleCodes: null,
        Status: ReasonCodeStatus.Active,
        Version: 1,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }
}
