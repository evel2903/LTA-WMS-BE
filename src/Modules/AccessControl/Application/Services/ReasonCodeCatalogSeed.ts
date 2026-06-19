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
    AppliesToActions: [ActionCode.Override],
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
