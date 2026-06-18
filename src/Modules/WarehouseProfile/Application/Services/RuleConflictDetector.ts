import { RuleConflictView } from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';

/**
 * Pure, read-only Application service that detects same-scope same-category conflicts (B4 AC3).
 *
 * It consumes the resolver's already-sorted RuleDecision.OrderedCandidates (winner first) and
 * never re-resolves, sorts, or touches I/O. A conflict is two or more rules that share the same
 * PrecedenceTier AND the same scope-signature (the B3 ScopeKey over the six axes) but disagree on
 * ControlMode OR on the configured action (action_json). Precedence/specificity cannot
 * deterministically rank such rules beyond the priority/recency tie-break, so the resolver silently
 * picks one — the admin must see the ambiguity before activation (B5 uses this output). Action
 * divergence matters even when the control mode matches: e.g. two APPROVAL_REQUIRED rules whose
 * action_json differ (REQUIRE_APPROVAL vs SET_FLAG) still resolve to one arbitrarily.
 *
 * Cross-tier "shadowing" is NOT a conflict (it is a skipped reason). The group winner is whichever
 * member appears first in OrderedCandidates, so a Compliance hard block stays the deterministic
 * winner of its group (B3 sorts it first).
 */
export class RuleConflictDetector {
  public Detect(orderedCandidates: RuleDefinitionEntity[]): RuleConflictView[] {
    const groups = new Map<string, RuleDefinitionEntity[]>();

    // Preserve the incoming (resolver-sorted) order within each group so the first member is the
    // group winner.
    for (const rule of orderedCandidates) {
      const key = this.GroupKey(rule);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(rule);
      } else {
        groups.set(key, [rule]);
      }
    }

    const conflicts: RuleConflictView[] = [];
    for (const bucket of groups.values()) {
      if (bucket.length < 2) {
        continue;
      }
      if (!this.HasDivergentControlMode(bucket) && !this.HasDivergentAction(bucket)) {
        continue;
      }
      const winner = bucket[0];
      conflicts.push({
        PrecedenceTier: winner.PrecedenceTier,
        ScopeKey: winner.ScopeKey,
        WinnerRuleCode: winner.RuleCode,
        Rules: bucket.map((rule) => ({
          RuleCode: rule.RuleCode,
          RuleName: rule.RuleName,
          ControlMode: rule.ControlMode,
        })),
      });
    }

    return conflicts;
  }

  /** Same-scope same-category key: precedence tier + scope signature (the B3 ScopeKey). */
  private GroupKey(rule: RuleDefinitionEntity): string {
    return `${rule.PrecedenceTier}::${rule.ScopeKey}`;
  }

  private HasDivergentControlMode(bucket: RuleDefinitionEntity[]): boolean {
    const first = bucket[0].ControlMode;
    return bucket.some((rule) => rule.ControlMode !== first);
  }

  /**
   * Two same-scope same-tier rules with the SAME control mode but different action_json still
   * resolve to one arbitrarily, so they are a conflict. Actions are compared by a canonical
   * (key-sorted) JSON signature so key ordering does not produce false positives.
   */
  private HasDivergentAction(bucket: RuleDefinitionEntity[]): boolean {
    const first = this.ActionSignature(bucket[0]);
    return bucket.some((rule) => this.ActionSignature(rule) !== first);
  }

  private ActionSignature(rule: RuleDefinitionEntity): string {
    return this.CanonicalJson(rule.ActionJson);
  }

  /** Deterministic JSON with object keys sorted recursively, so {A,B} and {B,A} compare equal. */
  private CanonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.CanonicalJson(item)).join(',')}]`;
    }
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.CanonicalJson((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
}
