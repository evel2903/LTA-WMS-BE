import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import {
  BuildBinding,
  BuildProfile,
  BuildRule,
  At,
  Past,
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const now = new Date('2026-01-01T00:00:00.000Z');

async function setup() {
  const groups = new InMemoryRuleGroupRepository();
  const defs = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profiles = new InMemoryWarehouseProfileRepository();

  await groups.Create(
    new RuleGroupEntity({
      Id: 'group-active',
      GroupCode: 'R-COM',
      GroupName: 'Compliance',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );
  await groups.Create(
    new RuleGroupEntity({
      Id: 'group-placeholder',
      GroupCode: 'R-INBOUND',
      GroupName: 'Inbound',
      CatalogState: RuleGroupCatalogState.Placeholder,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );

  const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
  await profiles.Create(profile);
  const resolver = new RuleResolver(profiles, defs, bindings, groups, new ConditionEvaluator());
  return { groups, defs, bindings, profiles, resolver, profileId: profile.Id };
}

const context: RuleEvaluationContext = {
  WarehouseTypeCode: 'TIER_1',
  EvaluatedAt: At,
  Attributes: {},
};

describe('RuleResolver candidate filtering (AC1/AC2/AC5)', () => {
  it('excludes DRAFT and RETIRED rules', async () => {
    const fixture = await setup();
    const draft = BuildRule({ Status: RuleStatus.Draft, WarehouseTypeCode: 'TIER_1' });
    const retired = BuildRule({ Status: RuleStatus.Retired, WarehouseTypeCode: 'TIER_1' });
    const active = BuildRule({ Status: RuleStatus.Active, WarehouseTypeCode: 'TIER_1' });
    for (const r of [draft, retired, active]) await fixture.defs.Create(r);
    for (const r of [draft, retired, active]) await fixture.bindings.Create(BuildBinding(fixture.profileId, r.Id));

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([active.Id]);
  });

  it('excludes rules whose effective window has not started or has ended', async () => {
    const fixture = await setup();
    const notStarted = BuildRule({
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
    });
    const expired = BuildRule({
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: Past,
      EffectiveTo: new Date('2026-01-01T00:00:00.000Z'),
    });
    const current = BuildRule({ WarehouseTypeCode: 'TIER_1', EffectiveFrom: Past });
    for (const r of [notStarted, expired, current]) await fixture.defs.Create(r);
    for (const r of [notStarted, expired, current]) {
      await fixture.bindings.Create(BuildBinding(fixture.profileId, r.Id));
    }

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([current.Id]);
  });

  it('treats a null scope axis as wildcard but rejects a non-null mismatch', async () => {
    const fixture = await setup();
    const wildcardOwner = BuildRule({ WarehouseTypeCode: 'TIER_1' });
    const mismatchOwner = BuildRule({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-X' });
    await fixture.defs.Create(wildcardOwner);
    await fixture.defs.Create(mismatchOwner);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, wildcardOwner.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, mismatchOwner.Id));

    // context.OwnerId = 'owner-1' -> wildcard matches, owner-X rule is filtered out.
    const decision = await fixture.resolver.Resolve({ ...context, OwnerId: 'owner-1' });
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([wildcardOwner.Id]);
  });

  it('excludes rules belonging to a non-ACTIVE (placeholder) rule group', async () => {
    const fixture = await setup();
    const inActiveGroup = BuildRule({ WarehouseTypeCode: 'TIER_1', RuleGroupId: 'group-active' });
    const inPlaceholderGroup = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      WarehouseTypeCode: 'TIER_1',
      RuleGroupId: 'group-placeholder',
    });
    await fixture.defs.Create(inActiveGroup);
    await fixture.defs.Create(inPlaceholderGroup);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, inActiveGroup.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, inPlaceholderGroup.Id));

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([inActiveGroup.Id]);
  });

  it('excludes rules bound with IsEnabled = false', async () => {
    const fixture = await setup();
    const enabled = BuildRule({ WarehouseTypeCode: 'TIER_1' });
    const disabled = BuildRule({ WarehouseTypeCode: 'TIER_1' });
    await fixture.defs.Create(enabled);
    await fixture.defs.Create(disabled);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, enabled.Id, { IsEnabled: true }));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, disabled.Id, { IsEnabled: false }));

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([enabled.Id]);
  });

  it('excludes rules whose condition_json evaluates false against the context', async () => {
    const fixture = await setup();
    const matching = BuildRule({
      WarehouseTypeCode: 'TIER_1',
      ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'Temperature', Comparator: 'LT', Value: 8 }] },
    });
    const notMatching = BuildRule({
      WarehouseTypeCode: 'TIER_1',
      ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'Temperature', Comparator: 'GT', Value: 8 }] },
    });
    await fixture.defs.Create(matching);
    await fixture.defs.Create(notMatching);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, matching.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, notMatching.Id));

    const decision = await fixture.resolver.Resolve({ ...context, Attributes: { Temperature: 4 } });
    expect(decision.OrderedCandidates.map((r) => r.Id)).toEqual([matching.Id]);
  });
});
