import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { SkippedReason } from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import { BuildRule, At } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * A fake resolver that records the context it was given and returns a caller-supplied decision.
 * This isolates the use case mapping logic (winner / skipped / reason / control mode / conflict /
 * reason readiness / actor echo) from B3 resolver internals while still exercising the real
 * RuleConflictDetector + mapper.
 */
class FakeRuleResolver implements IRuleResolver {
  public LastContext: RuleEvaluationContext | null = null;

  constructor(private readonly decision: RuleDecision) {}

  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    this.LastContext = context;
    return this.decision;
  }
}

function buildUseCase(decision: RuleDecision): { useCase: PreviewRuleResolutionUseCase; resolver: FakeRuleResolver } {
  const resolver = new FakeRuleResolver(decision);
  const useCase = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
  return { useCase, resolver };
}

function decisionOf(winner: RuleDefinitionEntity | null, ordered: RuleDefinitionEntity[]): RuleDecision {
  const effectivePriorities: Record<string, number> = {};
  for (const rule of ordered) {
    effectivePriorities[rule.Id] = rule.Priority;
  }
  return {
    Winner: winner,
    Allowed: winner ? winner.ControlMode !== RuleControlMode.HardBlock : true,
    ApprovalRequired: winner ? winner.ControlMode === RuleControlMode.ApprovalRequired : false,
    OrderedCandidates: ordered,
    EffectivePriorities: effectivePriorities,
    ReasonReadiness: winner
      ? {
          RequiresReason: winner.RequiresReason,
          RequiresEvidence: winner.RequiresEvidence,
          AllowOverride: winner.AllowOverride,
        }
      : null,
  };
}

describe('PreviewRuleResolutionUseCase (AC1/AC2/AC4/AC5)', () => {
  it('AC1: maps the request to a RuleEvaluationContext and delegates to the resolver (read-only)', async () => {
    const winner = BuildRule({ WarehouseTypeCode: 'TIER_1', ControlMode: RuleControlMode.SoftWarning });
    const { useCase, resolver } = buildUseCase(decisionOf(winner, [winner]));

    await useCase.Execute({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: 'wh-1',
      ZoneId: 'zone-1',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      OrderType: 'INBOUND',
      EvaluatedAt: At,
      Attributes: { Weight: 10 },
    });

    expect(resolver.LastContext).not.toBeNull();
    expect(resolver.LastContext?.WarehouseTypeCode).toBe('TIER_1');
    expect(resolver.LastContext?.WarehouseId).toBe('wh-1');
    expect(resolver.LastContext?.OrderType).toBe('INBOUND');
    expect(resolver.LastContext?.EvaluatedAt).toBe(At);
    expect(resolver.LastContext?.Attributes).toEqual({ Weight: 10 });
  });

  it('AC1: throws BusinessRuleException (400/BUSINESS_RULE) when WarehouseTypeCode is missing', async () => {
    const { useCase } = buildUseCase(decisionOf(null, []));

    await expect(useCase.Execute({ WarehouseTypeCode: '' })).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(useCase.Execute({} as { WarehouseTypeCode: string })).rejects.toBeInstanceOf(BusinessRuleException);

    // This is the layer where the BUSINESS_RULE branch is reachable (over HTTP the ValidationPipe
    // rejects with VALIDATION first). Assert the typed status/code, not just the class.
    const error = await useCase.Execute({ WarehouseTypeCode: '   ' }).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(BusinessRuleException);
    expect((error as BusinessRuleException).StatusCode).toBe(400);
    expect((error as BusinessRuleException).ErrorCode).toBe('BUSINESS_RULE');
  });

  it('AC2: returns the winner (RuleCode/RuleName/PrecedenceTier/ControlMode)', async () => {
    const winner = BuildRule({
      RuleCode: 'COM-1',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.Winner).not.toBeNull();
    expect(result.Winner?.RuleCode).toBe('COM-1');
    expect(result.Winner?.PrecedenceTier).toBe(RulePrecedenceTier.Compliance);
    expect(result.Winner?.ControlMode).toBe(RuleControlMode.HardBlock);
  });

  it('AC2: returns a deterministic empty preview when no candidate matches (winner null, lists empty, allowed)', async () => {
    const { useCase } = buildUseCase(decisionOf(null, []));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.Winner).toBeNull();
    expect(result.Allowed).toBe(true);
    expect(result.SkippedRules).toEqual([]);
    expect(result.Conflicts).toEqual([]);
    expect(result.ReasonReadiness).toBeNull();
  });

  it('AC2/AC5: lists non-winner candidates as SkippedRules with precedence/specificity reasons in order', async () => {
    const winner = BuildRule({
      RuleCode: 'COM-1',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    // Lower tier than winner.
    const lowerTier = BuildRule({
      RuleCode: 'OPT-1',
      PrecedenceTier: RulePrecedenceTier.Optimization,
      ControlMode: RuleControlMode.AutoSuggestion,
      WarehouseTypeCode: 'TIER_1',
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner, lowerTier]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.SkippedRules).toHaveLength(1);
    expect(result.SkippedRules[0].RuleCode).toBe('OPT-1');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.LowerTier);
  });

  it('AC2: a same-tier less-specific candidate is skipped with LESS_SPECIFIC reason', async () => {
    const winner = BuildRule({
      RuleCode: 'OP-SPECIFIC',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const lessSpecific = BuildRule({
      RuleCode: 'OP-BROAD',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner, lessSpecific]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-1' });

    expect(result.SkippedRules[0].RuleCode).toBe('OP-BROAD');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.LessSpecific);
  });

  it('AC2: a same-tier same-specificity candidate losing the priority tie-break is skipped with LOWER_PRIORITY_TIEBREAK', async () => {
    const winner = BuildRule({
      RuleCode: 'OP-WIN',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      Priority: 10,
    });
    const lowerPriority = BuildRule({
      RuleCode: 'OP-LOSE',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      Priority: 50,
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner, lowerPriority]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.SkippedRules[0].RuleCode).toBe('OP-LOSE');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.LowerPriorityTieBreak);
  });

  it('AC2: a same-Compliance-tier non-hard-block sibling is skipped with SHADOWED_BY_COMPLIANCE_HARD_BLOCK', async () => {
    const hardBlock = BuildRule({
      RuleCode: 'COM-BLOCK',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const sibling = BuildRule({
      RuleCode: 'COM-WARN',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    const { useCase } = buildUseCase(decisionOf(hardBlock, [hardBlock, sibling]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.SkippedRules[0].RuleCode).toBe('COM-WARN');
    expect(result.SkippedRules[0].Reason).toBe(SkippedReason.ShadowedByComplianceHardBlock);
  });

  it('AC4: HARD_BLOCK winner -> Allowed=false + IsHardBlock=true', async () => {
    const winner = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.Allowed).toBe(false);
    expect(result.ControlMode.IsHardBlock).toBe(true);
    expect(result.ControlMode.ApprovalRequired).toBe(false);
  });

  it('AC4: APPROVAL_REQUIRED winner -> ApprovalRequired=true, Allowed=true', async () => {
    const winner = BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, WarehouseTypeCode: 'TIER_1' });
    const { useCase } = buildUseCase(decisionOf(winner, [winner]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.Allowed).toBe(true);
    expect(result.ControlMode.ApprovalRequired).toBe(true);
    expect(result.ControlMode.IsHardBlock).toBe(false);
  });

  it('AC4: SOFT_WARNING winner -> warning message present', async () => {
    const winner = BuildRule({
      RuleCode: 'WARN-1',
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    const decision = decisionOf(winner, [winner]);
    decision.Warning = { Message: 'Soft warning from rule WARN-1', RuleCode: 'WARN-1' };
    const { useCase } = buildUseCase(decision);

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.ControlMode.Warning?.Message).toBe('Soft warning from rule WARN-1');
    expect(result.ControlMode.Suggestion).toBeUndefined();
  });

  it('AC4: AUTO_SUGGESTION winner -> suggestion message present', async () => {
    const winner = BuildRule({
      RuleCode: 'SUG-1',
      ControlMode: RuleControlMode.AutoSuggestion,
      WarehouseTypeCode: 'TIER_1',
    });
    const decision = decisionOf(winner, [winner]);
    decision.Suggestion = { Message: 'Auto suggestion from rule SUG-1', RuleCode: 'SUG-1' };
    const { useCase } = buildUseCase(decision);

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1' });

    expect(result.ControlMode.Suggestion?.Message).toBe('Auto suggestion from rule SUG-1');
    expect(result.ControlMode.Warning).toBeUndefined();
  });

  it('AC4: exposes ReasonReadiness from the winner and echoes the actor context as metadata', async () => {
    const winner = BuildRule({
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      RequiresReason: true,
      RequiresEvidence: true,
      AllowOverride: false,
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner]));

    const result = await useCase.Execute({
      WarehouseTypeCode: 'TIER_1',
      ActorUserId: 'user-9',
      Action: 'PUTAWAY',
      ObjectType: 'INVENTORY',
      ObjectId: 'inv-1',
      ReasonCode: 'OVERRIDE_APPROVED',
    });

    expect(result.ReasonReadiness).toEqual({
      RequiresReason: true,
      RequiresEvidence: true,
      AllowOverride: false,
    });
    expect(result.ActorContext).toEqual({
      ActorUserId: 'user-9',
      Action: 'PUTAWAY',
      ObjectType: 'INVENTORY',
      ObjectId: 'inv-1',
      ReasonCode: 'OVERRIDE_APPROVED',
    });
  });

  it('AC5: a multi-rule context yields the right winner, skipped reasons, control mode AND conflict metadata', async () => {
    // Two Owner/Contract rules same scope, divergent control mode -> conflict; winner is the
    // compliance hard block in a higher tier; the owner rules are skipped LOWER_TIER but still
    // surface as a conflict group.
    const winner = BuildRule({
      RuleCode: 'COM-1',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const ownerApproval = BuildRule({
      RuleCode: 'OWN-APPROVAL',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const ownerWarning = BuildRule({
      RuleCode: 'OWN-WARNING',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const { useCase } = buildUseCase(decisionOf(winner, [winner, ownerApproval, ownerWarning]));

    const result = await useCase.Execute({ WarehouseTypeCode: 'TIER_1', OwnerId: 'owner-1' });

    expect(result.Winner?.RuleCode).toBe('COM-1');
    expect(result.Allowed).toBe(false);
    expect(result.SkippedRules.map((rule) => rule.RuleCode)).toEqual(['OWN-APPROVAL', 'OWN-WARNING']);
    expect(result.Conflicts).toHaveLength(1);
    expect(result.Conflicts[0].PrecedenceTier).toBe(RulePrecedenceTier.OwnerContract);
    expect(result.Conflicts[0].Rules.map((rule) => rule.RuleCode).sort()).toEqual(['OWN-APPROVAL', 'OWN-WARNING']);
    expect(result.Conflicts[0].WinnerRuleCode).toBe('OWN-APPROVAL');
  });
});
