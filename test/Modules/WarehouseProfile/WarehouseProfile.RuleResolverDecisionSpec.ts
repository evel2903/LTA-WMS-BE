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

async function resolveSingle(controlMode: RuleControlMode) {
  const fixture = await setup();
  const rule = BuildRule({
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: controlMode,
    WarehouseTypeCode: 'TIER_1',
  });
  await fixture.defs.Create(rule);
  await fixture.bindings.Create(BuildBinding(fixture.profileId, rule.Id));
  return { rule, decision: await fixture.resolver.Resolve(context) };
}

describe('RuleResolver RuleDecision mapping (AC1/AC4)', () => {
  it('HARD_BLOCK winner -> Allowed=false', async () => {
    const { decision } = await resolveSingle(RuleControlMode.HardBlock);
    expect(decision.Allowed).toBe(false);
    expect(decision.ApprovalRequired).toBe(false);
  });

  it('APPROVAL_REQUIRED winner -> ApprovalRequired=true and Allowed=true', async () => {
    const { decision } = await resolveSingle(RuleControlMode.ApprovalRequired);
    expect(decision.Allowed).toBe(true);
    expect(decision.ApprovalRequired).toBe(true);
  });

  it('SOFT_WARNING winner -> Warning set, Allowed=true', async () => {
    const { decision } = await resolveSingle(RuleControlMode.SoftWarning);
    expect(decision.Allowed).toBe(true);
    expect(decision.Warning).toBeDefined();
    expect(decision.Suggestion).toBeUndefined();
  });

  it('AUTO_SUGGESTION winner -> Suggestion set, Allowed=true', async () => {
    const { decision } = await resolveSingle(RuleControlMode.AutoSuggestion);
    expect(decision.Allowed).toBe(true);
    expect(decision.Suggestion).toBeDefined();
    expect(decision.Warning).toBeUndefined();
  });

  it('reads ReasonReadiness from the winner flags (read-only metadata)', async () => {
    const fixture = await setup();
    const rule = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      RequiresReason: true,
      RequiresEvidence: true,
      AllowOverride: false,
    });
    await fixture.defs.Create(rule);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, rule.Id));

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.ReasonReadiness).toEqual({
      RequiresReason: true,
      RequiresEvidence: true,
      AllowOverride: false,
    });
  });

  it('orders OrderedCandidates with the winner first', async () => {
    const fixture = await setup();
    const low = BuildRule({ PrecedenceTier: RulePrecedenceTier.Optimization, WarehouseTypeCode: 'TIER_1' });
    const high = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    await fixture.defs.Create(low);
    await fixture.defs.Create(high);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, low.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, high.Id));

    const decision = await fixture.resolver.Resolve(context);
    expect(decision.OrderedCandidates[0].Id).toBe(high.Id);
    expect(decision.OrderedCandidates).toHaveLength(2);
    expect(decision.Winner?.Id).toBe(high.Id);
  });

  it('returns an allowed, winner-less decision when no rule matches', async () => {
    const fixture = await setup();
    const decision = await fixture.resolver.Resolve(context);
    expect(decision.Winner).toBeNull();
    expect(decision.Allowed).toBe(true);
    expect(decision.ApprovalRequired).toBe(false);
    expect(decision.OrderedCandidates).toEqual([]);
    expect(decision.ReasonReadiness).toBeNull();
  });

  it('returns an allowed, winner-less decision when no active profile resolves for the scope', async () => {
    const fixture = await setup();
    // A context whose warehouse type does not match any ACTIVE profile.
    const decision = await fixture.resolver.Resolve({ ...context, WarehouseTypeCode: 'TIER_UNKNOWN' });
    expect(decision.Winner).toBeNull();
    expect(decision.Allowed).toBe(true);
    expect(decision.OrderedCandidates).toEqual([]);
  });

  it('defaults EvaluatedAt to now when absent', async () => {
    const fixture = await setup();
    const rule = BuildRule({ WarehouseTypeCode: 'TIER_1' });
    await fixture.defs.Create(rule);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, rule.Id));

    const decision = await fixture.resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
    } as RuleEvaluationContext);
    expect(decision.Winner?.Id).toBe(rule.Id);
  });
});
