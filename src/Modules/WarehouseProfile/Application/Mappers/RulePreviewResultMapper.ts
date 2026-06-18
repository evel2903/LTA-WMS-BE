import {
  ActorContextView,
  AppliedRuleView,
  ControlModeSummary,
  PreviewRuleResolutionInput,
  RuleConflictView,
  RulePreviewResult,
  SkippedReason,
  SkippedRuleView,
} from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RulePrecedenceOrder, RuleSpecificityScore } from '@modules/WarehouseProfile/Domain/Services/RulePrecedence';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';

/**
 * The single boundary that knows both the Domain shapes (RuleDecision / RuleDefinitionEntity) and
 * the B4 response shape (RulePreviewResult). It projects a B3 decision plus the detected conflicts
 * and the actor input onto the PascalCase preview contract.
 *
 * Skipped reasons are derived from RulePrecedence (RulePrecedenceOrder + RuleSpecificityScore) so
 * the taxonomy is a single source of truth and never contradicts the B3 sort. The mapper does NOT
 * re-resolve or re-sort; it trusts RuleDecision.OrderedCandidates (winner first).
 */
export class RulePreviewResultMapper {
  public ToResult(
    decision: RuleDecision,
    conflicts: RuleConflictView[],
    input: PreviewRuleResolutionInput,
  ): RulePreviewResult {
    return {
      Winner: this.ToAppliedRule(decision.Winner),
      Allowed: decision.Allowed,
      ApprovalRequired: decision.ApprovalRequired,
      ControlMode: this.ToControlModeSummary(decision),
      SkippedRules: this.ToSkippedRules(decision),
      Conflicts: conflicts,
      ReasonReadiness: decision.ReasonReadiness
        ? {
            RequiresReason: decision.ReasonReadiness.RequiresReason,
            RequiresEvidence: decision.ReasonReadiness.RequiresEvidence,
            AllowOverride: decision.ReasonReadiness.AllowOverride,
          }
        : null,
      ActorContext: this.ToActorContext(input),
    };
  }

  private ToAppliedRule(rule: RuleDefinitionEntity | null): AppliedRuleView | null {
    if (rule == null) {
      return null;
    }
    return {
      RuleCode: rule.RuleCode,
      RuleName: rule.RuleName,
      PrecedenceTier: rule.PrecedenceTier,
      ControlMode: rule.ControlMode,
    };
  }

  private ToControlModeSummary(decision: RuleDecision): ControlModeSummary {
    const winner = decision.Winner;
    return {
      Mode: winner ? winner.ControlMode : null,
      IsHardBlock: winner ? winner.ControlMode === RuleControlMode.HardBlock : false,
      ApprovalRequired: decision.ApprovalRequired,
      Warning: decision.Warning,
      Suggestion: decision.Suggestion,
    };
  }

  private ToSkippedRules(decision: RuleDecision): SkippedRuleView[] {
    const winner = decision.Winner;
    if (winner == null) {
      return [];
    }
    return decision.OrderedCandidates.filter((rule) => rule.Id !== winner.Id).map((rule) => ({
      RuleCode: rule.RuleCode,
      RuleName: rule.RuleName,
      PrecedenceTier: rule.PrecedenceTier,
      ControlMode: rule.ControlMode,
      Reason: this.ResolveSkippedReason(rule, winner, decision.EffectivePriorities),
    }));
  }

  /**
   * Derives the precedence/specificity reason a candidate lost to the winner, walking the SAME
   * tie-break ladder as the B3 sort key (RulePrecedence.ByPrecedenceThenSpecificityThenPriority):
   *   1. compliance hard-block shadow (a non-hard-block compliance sibling never beats the block);
   *   2. lower precedence tier;
   *   3. less specific scope (within the same tier);
   *   4. higher EFFECTIVE priority (binding override ?? raw priority — read from the decision, so the
   *      reason matches the signal the resolver actually used and never contradicts the sort);
   *   5. older EffectiveFrom (recency tie-break) — distinct NEWER_EFFECTIVE_WINS, not priority.
   * Anything below recency (CreatedAt) collapses into NEWER_EFFECTIVE_WINS as the recency reason.
   */
  private ResolveSkippedReason(
    candidate: RuleDefinitionEntity,
    winner: RuleDefinitionEntity,
    effectivePriorities: Record<string, number>,
  ): SkippedReason {
    const winnerIsComplianceHardBlock =
      winner.PrecedenceTier === RulePrecedenceTier.Compliance && winner.ControlMode === RuleControlMode.HardBlock;
    if (
      winnerIsComplianceHardBlock &&
      candidate.PrecedenceTier === RulePrecedenceTier.Compliance &&
      candidate.ControlMode !== RuleControlMode.HardBlock
    ) {
      return SkippedReason.ShadowedByComplianceHardBlock;
    }

    const tierDelta = RulePrecedenceOrder[candidate.PrecedenceTier] - RulePrecedenceOrder[winner.PrecedenceTier];
    if (tierDelta > 0) {
      return SkippedReason.LowerTier;
    }

    if (RuleSpecificityScore(candidate) < RuleSpecificityScore(winner)) {
      return SkippedReason.LessSpecific;
    }

    // Effective priority is the next sort signal. Fall back to the raw Priority only if the decision
    // did not carry an effective priority for a rule (defensive — the resolver always populates it).
    const candidatePriority = effectivePriorities[candidate.Id] ?? candidate.Priority;
    const winnerPriority = effectivePriorities[winner.Id] ?? winner.Priority;
    if (candidatePriority > winnerPriority) {
      return SkippedReason.LowerPriorityTieBreak;
    }

    // Same tier, specificity and effective priority: the resolver broke the tie by recency
    // (newer EffectiveFrom, then newer CreatedAt). Report that distinctly rather than as priority.
    return SkippedReason.NewerEffectiveWins;
  }

  private ToActorContext(input: PreviewRuleResolutionInput): ActorContextView {
    return {
      ActorUserId: input.ActorUserId ?? null,
      Action: input.Action ?? null,
      ObjectType: input.ObjectType ?? null,
      ObjectId: input.ObjectId ?? null,
      ReasonCode: input.ReasonCode ?? null,
    };
  }
}
