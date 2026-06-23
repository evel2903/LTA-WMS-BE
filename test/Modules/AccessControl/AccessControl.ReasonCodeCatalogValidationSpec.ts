import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { SeedReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
import { InMemoryReasonCodeRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const buildCatalog = async () => {
  const repo = new InMemoryReasonCodeRepository();
  await SeedReasonCodeCatalog(repo);
  return { repo, catalog: new ReasonCodeCatalog(repo) };
};

describe('ReasonCodeCatalog.ValidateReason', () => {
  it('returns evidence/approval flags for a valid (active, applicable) reason', async () => {
    const { catalog } = await buildCatalog();
    const result = await catalog.ValidateReason({
      ReasonCode: 'RC-RULE-OVERRIDE',
      Action: ActionCode.Override,
      ObjectType: ObjectType.Rule,
    });
    expect(result.EvidenceRequired).toBe(true);
    expect(result.ApprovalRequired).toBe(true);
    expect(result.ReasonCodeId).toBeDefined();
  });

  it('throws for an unknown reason code', async () => {
    const { catalog } = await buildCatalog();
    await expect(
      catalog.ValidateReason({ ReasonCode: 'NOPE', Action: ActionCode.Override, ObjectType: ObjectType.Rule }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws when the reason does not apply to the (action, object)', async () => {
    const { catalog } = await buildCatalog();
    await expect(
      catalog.ValidateReason({
        ReasonCode: 'RC-RULE-OVERRIDE',
        Action: ActionCode.Create,
        ObjectType: ObjectType.Site,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws for an inactive reason code (not usable for a new mutation)', async () => {
    const { repo, catalog } = await buildCatalog();
    const now = new Date();
    await repo.Create(
      new ReasonCodeEntity({
        Id: randomUUID(),
        ReasonCode: 'RC-RETIRED',
        ReasonGroup: ReasonGroup.ManualFix,
        AppliesToActions: [ActionCode.Update],
        AppliesToObjects: [ObjectType.InventoryStatus],
        Status: ReasonCodeStatus.Inactive,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    await expect(
      catalog.ValidateReason({
        ReasonCode: 'RC-RETIRED',
        Action: ActionCode.Update,
        ObjectType: ObjectType.InventoryStatus,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    // but it is still readable
    expect(await repo.FindByCode('RC-RETIRED')).not.toBeNull();
  });

  it('V0-AC-01.2: the seeded reason-code catalog validates a master-data reason (closes the minimum)', async () => {
    const { catalog } = await buildCatalog();
    const result = await catalog.ValidateReason({
      ReasonCode: 'RC-MD-CREATE',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Site,
    });
    expect(result.ReasonCodeId).toBeDefined();
  });
});
