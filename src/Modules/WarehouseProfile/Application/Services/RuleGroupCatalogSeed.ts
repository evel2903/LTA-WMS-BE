import { randomUUID } from 'crypto';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';

export type RuleGroupCatalogEntry = {
  GroupCode: string;
  GroupName: string;
  Description: string;
  CatalogState: RuleGroupCatalogState;
  DisplayOrder: number;
};

/**
 * V0 rule group catalog. The four core groups are ACTIVE. R-INBOUND and R-PUT are ACTIVE as of
 * Epic 24 (IN-RULE-24), which wires the inbound/putaway flow into the rule engine. Remaining
 * V1+ business groups (outbound/transfer) stay PLACEHOLDER until their own epics ship.
 */
export const RuleGroupCatalogEntries: ReadonlyArray<RuleGroupCatalogEntry> = [
  {
    GroupCode: 'R-MD',
    GroupName: 'Master Data Rules',
    Description: 'Master data integrity and reference rules.',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 10,
  },
  {
    GroupCode: 'R-RBAC',
    GroupName: 'RBAC Rules',
    Description: 'Role and permission control rules.',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 20,
  },
  {
    GroupCode: 'R-COM',
    GroupName: 'Compliance Rules',
    Description: 'Compliance hard-block and regulatory rules.',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 30,
  },
  {
    GroupCode: 'R-INT',
    GroupName: 'Integrity Rules',
    Description: 'Data and inventory integrity rules.',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 40,
  },
  {
    GroupCode: 'R-INBOUND',
    GroupName: 'Inbound Rules',
    Description: 'Inbound receiving process rule group (gate-in, tolerance, QC, LPN).',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 100,
  },
  {
    GroupCode: 'R-PUT',
    GroupName: 'Putaway Rules',
    Description: 'Directed putaway / storage-strategy rule group.',
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: 105,
  },
  {
    GroupCode: 'R-OUTBOUND',
    GroupName: 'Outbound Rules',
    Description: 'Outbound process rule group (V1+ placeholder).',
    CatalogState: RuleGroupCatalogState.Placeholder,
    DisplayOrder: 110,
  },
  {
    GroupCode: 'R-TRANSFER',
    GroupName: 'Transfer Rules',
    Description: 'Stock transfer process rule group (V1+ placeholder).',
    CatalogState: RuleGroupCatalogState.Placeholder,
    DisplayOrder: 120,
  },
];

/**
 * Idempotent upsert seed: existing groups (matched by GroupCode) are updated in place when their
 * CatalogState/GroupName/Description/DisplayOrder drift from the catalog (e.g. a group promoted
 * from PLACEHOLDER to ACTIVE by a later epic); an exact match is a no-op. Re-running never creates
 * duplicates and never throws.
 */
export async function SeedRuleGroupCatalog(groupRepository: IRuleGroupRepository): Promise<void> {
  for (const entry of RuleGroupCatalogEntries) {
    const existing = await groupRepository.FindByCode(entry.GroupCode);
    if (existing) {
      const driftsFromCatalog =
        existing.CatalogState !== entry.CatalogState ||
        existing.GroupName !== entry.GroupName ||
        existing.Description !== entry.Description ||
        existing.DisplayOrder !== entry.DisplayOrder;
      if (driftsFromCatalog) {
        existing.CatalogState = entry.CatalogState;
        existing.GroupName = entry.GroupName;
        existing.Description = entry.Description;
        existing.DisplayOrder = entry.DisplayOrder;
        // UpdatedAt is a TypeORM @UpdateDateColumn — it is recomputed by save() regardless of
        // any value assigned here, so it is intentionally not set on this in-memory entity.
        await groupRepository.Update(existing);
      }
      continue;
    }
    const now = new Date();
    await groupRepository.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: entry.GroupCode,
        GroupName: entry.GroupName,
        Description: entry.Description,
        CatalogState: entry.CatalogState,
        DisplayOrder: entry.DisplayOrder,
        SourceSystem: 'SEED',
        ReferenceId: null,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: null,
        UpdatedBy: null,
      }),
    );
  }
}
