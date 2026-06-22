import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ROLE_PERMISSION_GRANTS } from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import {
  ReasonCodeCatalogEntries,
  SeedReasonCodeCatalog,
} from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
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

const REQUIRED_V1_REASON_CODES = [
  'RC-V1-CANCEL',
  'RC-V1-DISCREPANCY',
  'RC-V1-HOLD-RELEASE',
  'RC-V1-ADJUSTMENT',
  'RC-V1-OVERRIDE',
  'RC-V1-REPRINT',
  'RC-V1-DEAD-LETTER-FIX',
  'RC-V1-GOODS-ISSUE-CORRECTION',
  'RC-V1-HANDOFF',
];

const FORBIDDEN_INVENTORY_STATUS_MILESTONES = ['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED'];

const V1_TASK_OBJECTS: ObjectType[] = [
  ObjectType.QcTask,
  ObjectType.PutawayTask,
  ObjectType.ReplenishmentTask,
  ObjectType.PickTask,
  ObjectType.MobileTask,
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

  it('seeds the minimum V1 operational reasons against V1 objects', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(repo);

    for (const code of REQUIRED_V1_REASON_CODES) {
      const entry = await repo.FindByCode(code);
      expect(entry).not.toBeNull();
      expect(entry!.Status).toBe(ReasonCodeStatus.Active);
      expect(entry!.AppliesToObjects.length).toBeGreaterThan(0);
      expect(entry!.AppliesToActions.length).toBeGreaterThan(0);
    }

    const goodsIssueCorrection = await repo.FindByCode('RC-V1-GOODS-ISSUE-CORRECTION');
    expect(goodsIssueCorrection!.AppliesToObjects).toEqual(expect.arrayContaining([ObjectType.GoodsIssue]));
    expect(goodsIssueCorrection!.AppliesToActions).toEqual(
      expect.arrayContaining([ActionCode.Update, ActionCode.Adjust]),
    );

    const allSeedText = JSON.stringify(ReasonCodeCatalogEntries);
    for (const forbidden of FORBIDDEN_INVENTORY_STATUS_MILESTONES) {
      expect(allSeedText).not.toContain(forbidden);
    }

    const override = await repo.FindByCode('RC-V1-OVERRIDE');
    expect(override!.AppliesToObjects).toEqual(
      expect.arrayContaining([ObjectType.PutawayTask, ObjectType.Package, ObjectType.Load]),
    );
  });

  it('keeps broad V1 reasons scoped away from task-only actions without owner grants', () => {
    const cancel = ReasonCodeCatalogEntries.find((entry) => entry.ReasonCode === 'RC-V1-CANCEL');
    for (const taskObject of V1_TASK_OBJECTS) {
      expect(cancel!.AppliesToObjects).not.toContain(taskObject);
    }

    const adjustment = ReasonCodeCatalogEntries.find((entry) => entry.ReasonCode === 'RC-V1-ADJUSTMENT');
    expect(adjustment!.AppliesToObjects).not.toContain(ObjectType.ReplenishmentTask);
  });

  it('keeps every V1 reason action/object pair owned by at least one non-admin role grant', () => {
    const nonAdminGrantKeys = new Set(
      ROLE_PERMISSION_GRANTS.filter((grant) => grant.Role !== RoleCode.WmsAdmin).map(
        (grant) => `${grant.Action}:${grant.ObjectType}`,
      ),
    );

    for (const entry of ReasonCodeCatalogEntries.filter((reason) => reason.ReasonCode.startsWith('RC-V1-'))) {
      for (const action of entry.AppliesToActions) {
        for (const objectType of entry.AppliesToObjects) {
          expect(nonAdminGrantKeys.has(`${action}:${objectType}`)).toBe(true);
        }
      }
    }
  });

  it('validates the CoreFlow handoff/skip reason for CoreFlow mutations', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(repo);

    const handoff = await repo.FindByCode('RC-V1-HANDOFF');
    expect(handoff).not.toBeNull();
    expect(handoff!.AppliesToObjects).toContain(ObjectType.CoreFlow);
    expect(handoff!.AppliesToActions).toEqual(expect.arrayContaining([ActionCode.Update, ActionCode.Override]));
    expect(handoff!.EvidenceRequired).toBe(true);
  });
});
