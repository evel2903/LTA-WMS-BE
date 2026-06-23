import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
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
      GroupCode: 'R-MD',
      GroupName: 'Master',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );

  const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
  await profiles.Create(profile);
  const resolver = new RuleResolver(profiles, defs, bindings, groups, new ConditionEvaluator());
  return { groups, defs, bindings, profiles, resolver, profileId: profile.Id };
}

const fullContext: RuleEvaluationContext = {
  WarehouseTypeCode: 'TIER_1',
  WarehouseId: 'wh-1',
  OwnerId: 'owner-1',
  SkuId: 'sku-1',
  ItemClass: 'DRY',
  OrderType: 'B2C',
  EvaluatedAt: At,
  Attributes: {},
};

describe('RuleResolver specificity within the same tier (AC3)', () => {
  it('a SKU-specific rule beats a wildcard rule in the same tier', async () => {
    const fixture = await setup();
    const wildcard = BuildRule({ PrecedenceTier: RulePrecedenceTier.Operation, WarehouseTypeCode: 'TIER_1' });
    const skuSpecific = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      SkuId: 'sku-1',
    });
    await fixture.defs.Create(wildcard);
    await fixture.defs.Create(skuSpecific);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, wildcard.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, skuSpecific.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(skuSpecific.Id);
  });

  it('an owner-specific rule beats a warehouse-type-only rule in the same tier', async () => {
    const fixture = await setup();
    const typeOnly = BuildRule({ PrecedenceTier: RulePrecedenceTier.Operation, WarehouseTypeCode: 'TIER_1' });
    const ownerSpecific = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    await fixture.defs.Create(typeOnly);
    await fixture.defs.Create(ownerSpecific);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, typeOnly.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, ownerSpecific.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(ownerSpecific.Id);
  });

  it('order context outranks SKU specificity in the same tier', async () => {
    const fixture = await setup();
    const skuSpecific = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      SkuId: 'sku-1',
    });
    const orderSpecific = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OrderType: 'B2C',
    });
    await fixture.defs.Create(skuSpecific);
    await fixture.defs.Create(orderSpecific);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, skuSpecific.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, orderSpecific.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(orderSpecific.Id);
  });

  it('breaks specificity ties by effective priority ascending (lower wins)', async () => {
    const fixture = await setup();
    const high = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 200,
    });
    const low = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 50,
    });
    await fixture.defs.Create(high);
    await fixture.defs.Create(low);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, high.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, low.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(low.Id);
  });

  it('binding OverridePriority takes precedence over RuleDefinition.Priority for the tie-break', async () => {
    const fixture = await setup();
    // ruleA has a low base priority but binding overrides it to a high number (loses);
    // ruleB has a high base priority but binding overrides it to a low number (wins).
    const ruleA = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 10,
    });
    const ruleB = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 900,
    });
    await fixture.defs.Create(ruleA);
    await fixture.defs.Create(ruleB);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, ruleA.Id, { OverridePriority: 500 }));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, ruleB.Id, { OverridePriority: 5 }));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(ruleB.Id);
  });

  it('breaks priority ties by newer EffectiveFrom', async () => {
    const fixture = await setup();
    const older = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 100,
      EffectiveFrom: Past,
    });
    const newer = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Operation,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 100,
      EffectiveFrom: new Date('2026-05-01T00:00:00.000Z'),
    });
    await fixture.defs.Create(older);
    await fixture.defs.Create(newer);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, older.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, newer.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(newer.Id);
  });

  it('never lets specificity override a higher precedence tier', async () => {
    const fixture = await setup();
    const verySpecificLowTier = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Optimization,
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: 'wh-1',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      OrderType: 'B2C',
    });
    const generalHighTier = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Integrity,
      WarehouseTypeCode: 'TIER_1',
    });
    await fixture.defs.Create(verySpecificLowTier);
    await fixture.defs.Create(generalHighTier);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, verySpecificLowTier.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, generalHighTier.Id));

    const decision = await fixture.resolver.Resolve(fullContext);
    expect(decision.Winner?.Id).toBe(generalHighTier.Id);
  });
});
