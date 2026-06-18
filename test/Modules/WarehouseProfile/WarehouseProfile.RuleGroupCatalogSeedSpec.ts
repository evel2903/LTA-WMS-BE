import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import {
  SeedRuleGroupCatalog,
  RuleGroupCatalogEntries,
} from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { InMemoryRuleGroupRepository } from '@modules/WarehouseProfile/Test/RuleTestDoubles';

describe('Rule group catalog seed', () => {
  it('defines the four V0 active groups R-MD, R-RBAC, R-COM, R-INT', () => {
    const active = RuleGroupCatalogEntries.filter((e) => e.CatalogState === RuleGroupCatalogState.Active).map(
      (e) => e.GroupCode,
    );
    expect(active).toEqual(expect.arrayContaining(['R-MD', 'R-RBAC', 'R-COM', 'R-INT']));
  });

  it('defines at least one V1+ business group at PLACEHOLDER state', () => {
    const placeholders = RuleGroupCatalogEntries.filter((e) => e.CatalogState === RuleGroupCatalogState.Placeholder);
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
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
});
