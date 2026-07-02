import { randomUUID } from 'crypto';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import {
  SeedRuleGroupCatalog,
  RuleGroupCatalogEntries,
} from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { InMemoryRuleGroupRepository } from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';

describe('Rule group catalog seed', () => {
  it('defines the four V0 active groups R-MD, R-RBAC, R-COM, R-INT', () => {
    const active = RuleGroupCatalogEntries.filter((e) => e.CatalogState === RuleGroupCatalogState.Active).map(
      (e) => e.GroupCode,
    );
    expect(active).toEqual(expect.arrayContaining(['R-MD', 'R-RBAC', 'R-COM', 'R-INT']));
  });

  it('defines R-INBOUND and R-PUT as ACTIVE (Epic 24 / IN-RULE-24)', () => {
    const active = RuleGroupCatalogEntries.filter((e) => e.CatalogState === RuleGroupCatalogState.Active).map(
      (e) => e.GroupCode,
    );
    expect(active).toEqual(expect.arrayContaining(['R-INBOUND', 'R-PUT']));
  });

  it('defines at least one V1+ business group at PLACEHOLDER state', () => {
    const placeholders = RuleGroupCatalogEntries.filter((e) => e.CatalogState === RuleGroupCatalogState.Placeholder);
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it('still defines R-OUTBOUND and R-TRANSFER as PLACEHOLDER', () => {
    const placeholders = RuleGroupCatalogEntries.filter(
      (e) => e.CatalogState === RuleGroupCatalogState.Placeholder,
    ).map((e) => e.GroupCode);
    expect(placeholders).toEqual(expect.arrayContaining(['R-OUTBOUND', 'R-TRANSFER']));
  });

  it('seeds all catalog entries into an empty repository', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);

    const list = await groups.List(0, 100, {});
    expect(list.TotalItems).toBe(RuleGroupCatalogEntries.length);

    const codes = list.Items.map((g) => g.GroupCode);
    expect(codes).toEqual(expect.arrayContaining(['R-MD', 'R-RBAC', 'R-COM', 'R-INT']));

    const mdGroup = list.Items.find((g) => g.GroupCode === 'R-MD');
    expect(mdGroup?.CatalogState).toBe(RuleGroupCatalogState.Active);
  });

  it('is idempotent: re-running does not create duplicates and does not throw', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    await expect(SeedRuleGroupCatalog(groups)).resolves.not.toThrow();

    const list = await groups.List(0, 100, {});
    expect(list.TotalItems).toBe(RuleGroupCatalogEntries.length);
  });

  it('upserts CatalogState for a pre-existing group that drifts from the catalog (e.g. promoted from PLACEHOLDER to ACTIVE)', async () => {
    const groups = new InMemoryRuleGroupRepository();
    // Seed a stale R-INBOUND row still at PLACEHOLDER (as it was before Epic 24), simulating a DB
    // that was seeded by an earlier version of the catalog.
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-INBOUND',
        GroupName: 'Inbound Rules',
        Description: 'Inbound process rule group (V1+ placeholder).',
        CatalogState: RuleGroupCatalogState.Placeholder,
        DisplayOrder: 100,
        SourceSystem: 'SEED',
        ReferenceId: null,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        CreatedBy: null,
        UpdatedBy: null,
      }),
    );

    await SeedRuleGroupCatalog(groups);

    const updated = await groups.FindByCode('R-INBOUND');
    expect(updated?.CatalogState).toBe(RuleGroupCatalogState.Active);

    const list = await groups.List(0, 100, {});
    expect(list.TotalItems).toBe(RuleGroupCatalogEntries.length);
  });

  it('does not call Update when an existing group already matches the catalog exactly', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const updateSpy = jest.spyOn(groups, 'Update');

    await SeedRuleGroupCatalog(groups);

    expect(updateSpy).not.toHaveBeenCalled();
  });
});
