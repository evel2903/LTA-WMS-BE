import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { SeedReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
import { InMemoryReasonCodeRepository } from '@modules/AccessControl/Test/AccessControlTestDoubles';

const REQUIRED_ACTIONS: ActionCode[] = [
  ActionCode.Create,
  ActionCode.Update,
  ActionCode.DeleteCancel,
  ActionCode.Approve,
  ActionCode.Override,
  ActionCode.Unlock,
  ActionCode.Reprint,
  ActionCode.Adjust,
];

describe('SeedReasonCodeCatalog', () => {
  it('covers every standard V0 action and seeds active codes', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(repo);

    const { Items } = await repo.List(0, 1000);
    expect(Items.length).toBeGreaterThan(0);
    expect(Items.every((rc) => rc.Status === ReasonCodeStatus.Active)).toBe(true);

    const coveredActions = new Set(Items.flatMap((rc) => rc.AppliesToActions));
    for (const action of REQUIRED_ACTIONS) {
      expect(coveredActions.has(action)).toBe(true);
    }
  });

  it('is idempotent (re-run does not duplicate)', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(repo);
    const first = (await repo.List(0, 1000)).TotalItems;
    await SeedReasonCodeCatalog(repo);
    const second = (await repo.List(0, 1000)).TotalItems;
    expect(second).toBe(first);
  });
});
