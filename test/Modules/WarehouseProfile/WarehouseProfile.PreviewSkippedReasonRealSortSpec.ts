import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { SkippedReason } from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
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

/**
 * AC2 regression guard (review finding #1): the displayed skipped reason MUST be computed from the
 * SAME tie-break signals that drove the B3 sort and must never contradict it. These tests drive the
 * REAL RuleResolver (not a hand-built OrderedCandidates), so the binding OverridePriority and the
 * EffectiveFrom recency tie-break that the resolver actually used are exercised end to end.
 */
const now = new Date('2026-01-01T00:00:00.000Z');

async function setupUseCase() {
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
  const useCase = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
  return { groups, defs, bindings, profiles, resolver, useCase, profileId: profile.Id };
}

describe('Preview skipped reason vs the real B3 sort (AC2, finding #1)', () => {
  it('does NOT mislabel the loser when the winner won via a LOWER binding OverridePriority but has a HIGHER raw Priority', async () => {
    const fixture = await setupUseCase();
    // winnerRaw has a HIGH raw Priority (900) but its binding overrides it to a LOW effective priority
    // (5) -> it wins on effective priority. loserRaw has a LOW raw Priority (10) but its binding
    // overrides it to a HIGH effective priority (500) -> it loses. By RAW priority the loser looks
    // "higher" (10 < 900), so any reason computed from raw Priority would contradict the real sort.
    const winnerRaw = BuildRule({
      RuleCode: 'OP-WIN',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 900,
    });
    const loserRaw = BuildRule({
      RuleCode: 'OP-LOSE',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 10,
    });
    await fixture.defs.Create(winnerRaw);
    await fixture.defs.Create(loserRaw);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, winnerRaw.Id, { OverridePriority: 5 }));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, loserRaw.Id, { OverridePriority: 500 }));

    const result = await fixture.useCase.Execute({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-1' });

    // The resolver winner is OP-WIN (effective priority 5 < 500); the preview must agree.
    expect(result.Winner?.RuleCode).toBe('OP-WIN');
    expect(result.SkippedRules).toHaveLength(1);
    expect(result.SkippedRules[0].RuleCode).toBe('OP-LOSE');
    // The loser lost on the EFFECTIVE priority tie-break, consistent with the real sort.
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.LowerPriorityTieBreak);
  });

  it('labels a recency tie-break loser NEWER_EFFECTIVE_WINS, not LOWER_PRIORITY_TIEBREAK', async () => {
    const fixture = await setupUseCase();
    // Same tier, same scope (specificity), same effective priority -> the resolver breaks the tie by
    // newer EffectiveFrom. The older rule must be reported as losing on recency, NOT priority.
    const older = BuildRule({
      RuleCode: 'OP-OLD',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 100,
      EffectiveFrom: Past,
    });
    const newer = BuildRule({
      RuleCode: 'OP-NEW',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 100,
      EffectiveFrom: new Date('2026-05-01T00:00:00.000Z'),
    });
    await fixture.defs.Create(older);
    await fixture.defs.Create(newer);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, older.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, newer.Id));

    const result = await fixture.useCase.Execute({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-1' });

    expect(result.Winner?.RuleCode).toBe('OP-NEW');
    expect(result.SkippedRules).toHaveLength(1);
    expect(result.SkippedRules[0].RuleCode).toBe('OP-OLD');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.NewerEffectiveWins);
  });

  it('still reports LOWER_PRIORITY_TIEBREAK when only the raw priority (no override, same recency) differs', async () => {
    const fixture = await setupUseCase();
    const winner = BuildRule({
      RuleCode: 'OP-PWIN',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 10,
      EffectiveFrom: At,
    });
    const loser = BuildRule({
      RuleCode: 'OP-PLOSE',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      Priority: 50,
      EffectiveFrom: At,
    });
    await fixture.defs.Create(winner);
    await fixture.defs.Create(loser);
    await fixture.bindings.Create(BuildBinding(fixture.profileId, winner.Id));
    await fixture.bindings.Create(BuildBinding(fixture.profileId, loser.Id));

    const result = await fixture.useCase.Execute({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-1' });

    expect(result.Winner?.RuleCode).toBe('OP-PWIN');
    expect(result.SkippedRules[0].RuleCode).toBe('OP-PLOSE');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.LowerPriorityTieBreak);
  });
});
