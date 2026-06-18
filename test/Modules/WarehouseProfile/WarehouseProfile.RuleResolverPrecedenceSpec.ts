import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
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
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const now = new Date('2026-01-01T00:00:00.000Z');

type Fixture = {
  groups: InMemoryRuleGroupRepository;
  defs: InMemoryRuleDefinitionRepository;
  bindings: InMemoryWarehouseProfileRuleRepository;
  profiles: InMemoryWarehouseProfileRepository;
  resolver: RuleResolver;
  profileId: string;
};

async function setup(): Promise<Fixture> {
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

  const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
  await profiles.Create(profile);

  const resolver = new RuleResolver(profiles, defs, bindings, groups, new ConditionEvaluator());

  return { groups, defs, bindings, profiles, resolver, profileId: profile.Id };
}

async function bindAll(fixture: Fixture, ruleIds: string[]): Promise<void> {
  for (const id of ruleIds) {
    await fixture.bindings.Create(BuildBinding(fixture.profileId, id));
  }
}

const context: RuleEvaluationContext = {
  WarehouseTypeCode: 'TIER_1',
  EvaluatedAt: At,
  Attributes: {},
};

describe('RuleResolver precedence (AC2/AC4/AC5)', () => {
  it('Compliance wins over Optimization regardless of order', async () => {
    const fixture = await setup();
    const optimization = BuildRule({ PrecedenceTier: RulePrecedenceTier.Optimization, WarehouseTypeCode: 'TIER_1' });
    const compliance = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    await fixture.defs.Create(optimization);
    await fixture.defs.Create(compliance);
    await bindAll(fixture, [optimization.Id, compliance.Id]);

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.Winner?.Id).toBe(compliance.Id);
  });

  it('Integrity wins over Owner/Contract', async () => {
    const fixture = await setup();
    const owner = BuildRule({ PrecedenceTier: RulePrecedenceTier.OwnerContract, WarehouseTypeCode: 'TIER_1' });
    const integrity = BuildRule({ PrecedenceTier: RulePrecedenceTier.Integrity, WarehouseTypeCode: 'TIER_1' });
    await fixture.defs.Create(owner);
    await fixture.defs.Create(integrity);
    await bindAll(fixture, [owner.Id, integrity.Id]);

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.Winner?.Id).toBe(integrity.Id);
  });

  it('Physical wins over Operation', async () => {
    const fixture = await setup();
    const operation = BuildRule({ PrecedenceTier: RulePrecedenceTier.Operation, WarehouseTypeCode: 'TIER_1' });
    const physical = BuildRule({ PrecedenceTier: RulePrecedenceTier.Physical, WarehouseTypeCode: 'TIER_1' });
    await fixture.defs.Create(operation);
    await fixture.defs.Create(physical);
    await bindAll(fixture, [operation.Id, physical.Id]);

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.Winner?.Id).toBe(physical.Id);
  });

  it('orders all six tiers Compliance -> Integrity -> Physical -> Owner/Contract -> Operation -> Optimization (AC5)', async () => {
    const fixture = await setup();
    const tiers = [
      RulePrecedenceTier.Optimization,
      RulePrecedenceTier.Operation,
      RulePrecedenceTier.OwnerContract,
      RulePrecedenceTier.Physical,
      RulePrecedenceTier.Integrity,
      RulePrecedenceTier.Compliance,
    ];
    const rules = tiers.map((tier) => BuildRule({ PrecedenceTier: tier, WarehouseTypeCode: 'TIER_1' }));
    for (const rule of rules) await fixture.defs.Create(rule);
    await bindAll(
      fixture,
      rules.map((r) => r.Id),
    );

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates.map((r) => r.PrecedenceTier)).toEqual([
      RulePrecedenceTier.Compliance,
      RulePrecedenceTier.Integrity,
      RulePrecedenceTier.Physical,
      RulePrecedenceTier.OwnerContract,
      RulePrecedenceTier.Operation,
      RulePrecedenceTier.Optimization,
    ]);
  });

  it('compliance hard block wins and is not overridden by lower tiers even with more specific scope or lower priority (AC4/AC5)', async () => {
    const fixture = await setup();
    // Lower tiers made deliberately "stronger" by specificity + priority, but must still lose.
    const specificOptimization = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Optimization,
      WarehouseTypeCode: 'TIER_1',
      OrderType: 'B2C',
      Priority: 1,
    });
    const compliance = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      Priority: 999,
    });
    await fixture.defs.Create(specificOptimization);
    await fixture.defs.Create(compliance);
    await bindAll(fixture, [specificOptimization.Id, compliance.Id]);

    const decision = await fixture.resolver.Resolve({ ...context, OrderType: 'B2C' });
    expect(decision.Winner?.Id).toBe(compliance.Id);
    expect(decision.Allowed).toBe(false);
  });

  it('compliance hard block is not bypassed by a MORE-SPECIFIC soft-warning rule in the same tier (AC4 invariant)', async () => {
    const fixture = await setup();
    // Same tier (COMPLIANCE). The soft warning is deliberately "stronger" on the intra-tier sort:
    // more specific scope (OwnerId) AND lower priority -> it sorts to the front of OrderedCandidates.
    // The hard block is general scope + high priority, so it sorts AFTER the soft warning.
    // The invariant must still hold: a COMPLIANCE HARD_BLOCK forces Winner = that rule, Allowed = false.
    const specificSoftWarning = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 1,
    });
    const generalHardBlock = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      Priority: 999,
    });
    await fixture.defs.Create(specificSoftWarning);
    await fixture.defs.Create(generalHardBlock);
    await bindAll(fixture, [specificSoftWarning.Id, generalHardBlock.Id]);

    const decision = await fixture.resolver.Resolve({ ...context, OwnerId: 'owner-1' });
    expect(decision.Allowed).toBe(false);
    expect(decision.Winner?.Id).toBe(generalHardBlock.Id);
  });

  it('only candidates that pass the scope + condition filter are sorted (AC2)', async () => {
    const fixture = await setup();
    const matching = BuildRule({ PrecedenceTier: RulePrecedenceTier.Operation, WarehouseTypeCode: 'TIER_1' });
    const otherWarehouse = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: 'wh-other',
    });
    await fixture.defs.Create(matching);
    await fixture.defs.Create(otherWarehouse);
    await bindAll(fixture, [matching.Id, otherWarehouse.Id]);

    // context has no WarehouseId, so the warehouse-scoped compliance rule must be filtered out.
    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates).toHaveLength(1);
    expect(decision.Winner?.Id).toBe(matching.Id);
  });
});
