import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import {
  ByPrecedenceThenSpecificityThenPriority,
  ResolvedCandidate,
  RuleSpecificityScore,
} from '@modules/WarehouseProfile/Domain/Services/RulePrecedence';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

const EmptyDecision: RuleDecision = {
  Winner: null,
  Allowed: true,
  ApprovalRequired: false,
  OrderedCandidates: [],
  EffectivePriorities: {},
  ReasonReadiness: null,
};

/**
 * Pure Application service implementing the architecture 5.5 resolve flow (steps 1-6) over the
 * repository ports. No controller / Nest request / TypeORM / Infrastructure dependency.
 *
 * Step 7 (override execution + audit) is NOT implemented in B3; only its invariant is enforced:
 * a Compliance hard block cannot be overridden by any lower tier (it sorts first and forces
 * Allowed=false). The resolver accepts no "override" flag.
 */
export class RuleResolver implements IRuleResolver {
  constructor(
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly definitionRepository: IRuleDefinitionRepository,
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly groupRepository: IRuleGroupRepository,
    private readonly conditionEvaluator: ConditionEvaluator,
  ) {}

  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    const evaluatedAt = context.EvaluatedAt ?? new Date();

    // Step 2: resolve the most specific ACTIVE profile matching the context scope.
    const profile = await this.ResolveActiveProfile(context, evaluatedAt);
    if (!profile) {
      return { ...EmptyDecision, OrderedCandidates: [] };
    }

    // Step 3: load enabled rules of that profile, restricted to ACTIVE rule groups.
    const candidatesWithPriority = await this.LoadEnabledRules(profile);

    // Step 4: filter candidates by active-at-time + scope match + condition true.
    const filtered = candidatesWithPriority.filter(({ Rule }) => this.IsCandidate(Rule, context, evaluatedAt));

    // Step 5: sort by precedence -> specificity -> priority -> recency.
    const sorted = [...filtered].sort(ByPrecedenceThenSpecificityThenPriority);

    // Step 6: produce the decision.
    return this.ToDecision(sorted);
  }

  private async ResolveActiveProfile(
    context: RuleEvaluationContext,
    evaluatedAt: Date,
  ): Promise<WarehouseProfileEntity | null> {
    const active = await this.profileRepository.ListActiveByScope(evaluatedAt);
    const matching = active.filter((profile) => this.ProfileMatchesScope(profile, context));
    if (matching.length === 0) {
      return null;
    }

    // Most specific profile wins; ties broken by newer version then newer effective_from.
    return matching.reduce((best, candidate) => {
      const bestScore = this.ProfileSpecificity(best);
      const candidateScore = this.ProfileSpecificity(candidate);
      if (candidateScore !== bestScore) {
        return candidateScore > bestScore ? candidate : best;
      }
      if (candidate.Version !== best.Version) {
        return candidate.Version > best.Version ? candidate : best;
      }
      return candidate.EffectiveFrom.getTime() > best.EffectiveFrom.getTime() ? candidate : best;
    });
  }

  private async LoadEnabledRules(profile: WarehouseProfileEntity): Promise<ResolvedCandidate[]> {
    const bindings: Array<{ RuleDefinitionId: string; OverridePriority: number | null }> = [];
    const pageSize = 100;
    let skip = 0;
    // Page through enabled bindings; ListByProfile is paginated in the port.
    for (;;) {
      const page = await this.bindingRepository.ListByProfile(profile.Id, skip, pageSize);
      bindings.push(
        ...page.Items.filter((binding) => binding.IsEnabled).map((binding) => ({
          RuleDefinitionId: binding.RuleDefinitionId,
          OverridePriority: binding.OverridePriority,
        })),
      );
      skip += pageSize;
      if (skip >= page.TotalItems || page.Items.length === 0) {
        break;
      }
    }

    const activeGroupCache = new Map<string, boolean>();
    const candidates: ResolvedCandidate[] = [];
    for (const binding of bindings) {
      const rule = await this.definitionRepository.FindById(binding.RuleDefinitionId);
      if (!rule) {
        continue;
      }
      if (!(await this.IsRuleGroupActive(rule.RuleGroupId, activeGroupCache))) {
        continue;
      }
      candidates.push({
        Rule: rule,
        EffectivePriority: binding.OverridePriority ?? rule.Priority,
      });
    }
    return candidates;
  }

  private async IsRuleGroupActive(ruleGroupId: string, cache: Map<string, boolean>): Promise<boolean> {
    const cached = cache.get(ruleGroupId);
    if (cached !== undefined) {
      return cached;
    }
    const group = await this.groupRepository.FindById(ruleGroupId);
    const isActive = group?.CatalogState === RuleGroupCatalogState.Active;
    cache.set(ruleGroupId, isActive);
    return isActive;
  }

  private IsCandidate(rule: RuleDefinitionEntity, context: RuleEvaluationContext, evaluatedAt: Date): boolean {
    return (
      this.IsActiveAt(rule, evaluatedAt) &&
      this.RuleMatchesScope(rule, context) &&
      this.conditionEvaluator.Matches(rule.ConditionJson, context)
    );
  }

  private IsActiveAt(rule: RuleDefinitionEntity, evaluatedAt: Date): boolean {
    if (rule.Status !== RuleStatus.Active) {
      return false;
    }
    if (rule.EffectiveFrom.getTime() > evaluatedAt.getTime()) {
      return false;
    }
    return rule.EffectiveTo === null || rule.EffectiveTo.getTime() > evaluatedAt.getTime();
  }

  private RuleMatchesScope(rule: RuleDefinitionEntity, context: RuleEvaluationContext): boolean {
    return this.AxesMatch(
      {
        WarehouseTypeCode: rule.WarehouseTypeCode,
        WarehouseId: rule.WarehouseId,
        ZoneId: rule.ZoneId,
        LocationType: rule.LocationType,
        OwnerId: rule.OwnerId,
        SkuId: rule.SkuId,
        ItemClass: rule.ItemClass,
        OrderType: rule.OrderType,
        CustomerId: rule.CustomerId,
        SupplierId: rule.SupplierId,
      },
      context,
    );
  }

  private ProfileMatchesScope(profile: WarehouseProfileEntity, context: RuleEvaluationContext): boolean {
    return this.AxesMatch(
      {
        WarehouseTypeCode: profile.WarehouseTypeCode,
        WarehouseId: profile.WarehouseId,
        ZoneId: profile.ZoneId,
        LocationType: profile.LocationType,
        OwnerId: profile.OwnerId,
        SkuId: profile.SkuId,
        ItemClass: profile.ItemClass,
        OrderType: profile.OrderType,
        CustomerId: profile.CustomerId,
        SupplierId: profile.SupplierId,
      },
      context,
    );
  }

  /**
   * Per-axis wildcard match: a null axis on the rule/profile is a wildcard (matches anything);
   * a non-null axis must equal the corresponding context value. Uses `!= null` so "" / "0" are
   * treated as legitimate scope values rather than wildcards.
   */
  private AxesMatch(scope: ScopeAxes, context: RuleEvaluationContext): boolean {
    const pairs: Array<[string | null | undefined, string | null | undefined]> = [
      [scope.WarehouseTypeCode, context.WarehouseTypeCode],
      [scope.WarehouseId, context.WarehouseId],
      [scope.ZoneId, context.ZoneId],
      [scope.LocationType, context.LocationType],
      [scope.OwnerId, context.OwnerId],
      [scope.SkuId, context.SkuId],
      [scope.ItemClass, context.ItemClass],
      [scope.OrderType, context.OrderType],
      [scope.CustomerId, context.CustomerId],
      [scope.SupplierId, context.SupplierId],
    ];
    return pairs.every(([scopeValue, contextValue]) => scopeValue == null || scopeValue === (contextValue ?? null));
  }

  private ProfileSpecificity(profile: WarehouseProfileEntity): number {
    // Profiles carry the same six axes as rules; reuse the rule specificity scoring by adapting shape.
    return RuleSpecificityScore({
      WarehouseTypeCode: profile.WarehouseTypeCode,
      WarehouseId: profile.WarehouseId,
      ZoneId: profile.ZoneId,
      LocationType: profile.LocationType,
      OwnerId: profile.OwnerId,
      SkuId: profile.SkuId,
      ItemClass: profile.ItemClass,
      OrderType: profile.OrderType,
      CustomerId: profile.CustomerId,
      SupplierId: profile.SupplierId,
    } as RuleDefinitionEntity);
  }

  private ToDecision(sorted: ResolvedCandidate[]): RuleDecision {
    if (sorted.length === 0) {
      return { ...EmptyDecision, OrderedCandidates: [], EffectivePriorities: {} };
    }

    const ordered = sorted.map((candidate) => candidate.Rule);

    // Surface the effective priority (binding override ?? raw priority) that actually drove the sort
    // so B4 can explain the tie-break without re-reading bindings or contradicting this sort.
    const effectivePriorities: Record<string, number> = {};
    for (const candidate of sorted) {
      effectivePriorities[candidate.Rule.Id] = candidate.EffectivePriority;
    }

    // Invariant (architecture 5.5 / handoff rule 11): a Compliance hard block can never be
    // overridden by any other rule. If one matched, it MUST be the winner and Allowed=false,
    // independent of intra-tier specificity/priority. The comparator already sorts it to the
    // front; this is an explicit, defensive guard so the decision layer also owns the invariant
    // rather than trusting sort order alone.
    const complianceHardBlock = ordered.find(
      (rule) => rule.PrecedenceTier === RulePrecedenceTier.Compliance && rule.ControlMode === RuleControlMode.HardBlock,
    );

    const winner = complianceHardBlock ?? ordered[0];
    const decision: RuleDecision = {
      Winner: winner,
      Allowed: winner.ControlMode !== RuleControlMode.HardBlock,
      ApprovalRequired: winner.ControlMode === RuleControlMode.ApprovalRequired,
      OrderedCandidates: ordered,
      EffectivePriorities: effectivePriorities,
      ReasonReadiness: {
        RequiresReason: winner.RequiresReason,
        RequiresEvidence: winner.RequiresEvidence,
        AllowOverride: winner.AllowOverride,
      },
    };

    if (winner.ControlMode === RuleControlMode.SoftWarning) {
      decision.Warning = { Message: `Soft warning from rule ${winner.RuleCode}`, RuleCode: winner.RuleCode };
    } else if (winner.ControlMode === RuleControlMode.AutoSuggestion) {
      decision.Suggestion = { Message: `Auto suggestion from rule ${winner.RuleCode}`, RuleCode: winner.RuleCode };
    }

    return decision;
  }
}

interface ScopeAxes {
  WarehouseTypeCode: string | null;
  WarehouseId: string | null;
  ZoneId: string | null;
  LocationType: string | null;
  OwnerId: string | null;
  SkuId: string | null;
  ItemClass: string | null;
  OrderType: string | null;
  CustomerId: string | null;
  SupplierId: string | null;
}
