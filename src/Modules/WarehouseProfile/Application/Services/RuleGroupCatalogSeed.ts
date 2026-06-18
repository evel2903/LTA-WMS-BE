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
 * V0 rule group catalog. The four core groups are ACTIVE; V1+ business groups
 * (inbound/outbound/transfer) are PLACEHOLDER until their epics ship.
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
    Description: 'Inbound process rule group (V1+ placeholder).',
    CatalogState: RuleGroupCatalogState.Placeholder,
    DisplayOrder: 100,
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
 * Idempotent seed: existing groups (matched by GroupCode) are skipped, so re-running never
 * creates duplicates and never throws.
 */
export async function SeedRuleGroupCatalog(groupRepository: IRuleGroupRepository): Promise<void> {
  for (const entry of RuleGroupCatalogEntries) {
    const existing = await groupRepository.FindByCode(entry.GroupCode);
    if (existing) {
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
