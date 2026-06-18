import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';

/**
 * Single source of truth for the business precedence order (architecture 5.5):
 * Compliance > Integrity > Physical > Owner/Contract > Operation > Optimization.
 * Lower number = higher precedence (wins). This ordering is fixed and not configurable.
 */
export const RulePrecedenceOrder: Record<RulePrecedenceTier, number> = {
  [RulePrecedenceTier.Compliance]: 1,
  [RulePrecedenceTier.Integrity]: 2,
  [RulePrecedenceTier.Physical]: 3,
  [RulePrecedenceTier.OwnerContract]: 4,
  [RulePrecedenceTier.Operation]: 5,
  [RulePrecedenceTier.Optimization]: 6,
};

/**
 * Specificity weights per axis, in architecture 5.5 order
 * (order context > SKU/item class > owner > zone/location type > warehouse > warehouse type).
 *
 * Powers of two so any single higher axis always outweighs every lower axis combined:
 * a rule that is specific on a higher axis is always "more specific" regardless of how many
 * lower axes another rule fills. Specificity only ever breaks ties WITHIN a precedence tier.
 */
const SpecificityWeights = {
  OrderContext: 1 << 5,
  Sku: 1 << 4,
  Owner: 1 << 3,
  ZoneLocation: 1 << 2,
  Warehouse: 1 << 1,
  WarehouseType: 1 << 0,
};

function HasValue(value: string | null): boolean {
  // null = wildcard; "" / "0" are legitimate non-null scope values (avoid truthy checks for ids/strings).
  return value != null;
}

/**
 * Computes a specificity score for a rule from its scope axes. Higher = more specific.
 */
export function RuleSpecificityScore(rule: RuleDefinitionEntity): number {
  let score = 0;
  if (HasValue(rule.OrderType) || HasValue(rule.CustomerId) || HasValue(rule.SupplierId)) {
    score += SpecificityWeights.OrderContext;
  }
  if (HasValue(rule.SkuId) || HasValue(rule.ItemClass)) {
    score += SpecificityWeights.Sku;
  }
  if (HasValue(rule.OwnerId)) {
    score += SpecificityWeights.Owner;
  }
  if (HasValue(rule.ZoneId) || HasValue(rule.LocationType)) {
    score += SpecificityWeights.ZoneLocation;
  }
  if (HasValue(rule.WarehouseId)) {
    score += SpecificityWeights.Warehouse;
  }
  if (HasValue(rule.WarehouseTypeCode)) {
    score += SpecificityWeights.WarehouseType;
  }
  return score;
}

/**
 * A candidate pairs a rule with its effective priority (binding OverridePriority wins over
 * RuleDefinition.Priority), so the comparator can tie-break without re-reading bindings.
 */
export interface ResolvedCandidate {
  Rule: RuleDefinitionEntity;
  EffectivePriority: number;
}

/**
 * Comparator implementing the full sort key:
 *   (a) precedence tier ascending (Compliance first);
 *   (a') WITHIN the Compliance tier, a HARD_BLOCK outranks any non-hard-block compliance rule.
 *        This protects the invariant "never override a compliance hard block": a more-specific or
 *        lower-priority compliance rule (e.g. a soft warning) must NOT sort ahead of a compliance
 *        hard block, otherwise it would become the winner and silently allow a blocked operation.
 *   (b) specificity score descending (more specific first) — only within the same tier;
 *   (c) effective priority ascending (lower wins);
 *   (d) newer EffectiveFrom (then version-ish CreatedAt) wins.
 */
export function ByPrecedenceThenSpecificityThenPriority(a: ResolvedCandidate, b: ResolvedCandidate): number {
  const tierDelta = RulePrecedenceOrder[a.Rule.PrecedenceTier] - RulePrecedenceOrder[b.Rule.PrecedenceTier];
  if (tierDelta !== 0) {
    return tierDelta;
  }

  // Same tier from here on. If that tier is Compliance, a hard block must come first so that the
  // compliance hard block (and not a more-specific/lower-priority sibling) is the winner at index 0.
  if (a.Rule.PrecedenceTier === RulePrecedenceTier.Compliance) {
    const aHardBlock = a.Rule.ControlMode === RuleControlMode.HardBlock;
    const bHardBlock = b.Rule.ControlMode === RuleControlMode.HardBlock;
    if (aHardBlock !== bHardBlock) {
      return aHardBlock ? -1 : 1;
    }
  }

  const specificityDelta = RuleSpecificityScore(b.Rule) - RuleSpecificityScore(a.Rule);
  if (specificityDelta !== 0) {
    return specificityDelta;
  }

  const priorityDelta = a.EffectivePriority - b.EffectivePriority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const effectiveFromDelta = b.Rule.EffectiveFrom.getTime() - a.Rule.EffectiveFrom.getTime();
  if (effectiveFromDelta !== 0) {
    return effectiveFromDelta;
  }

  return b.Rule.CreatedAt.getTime() - a.Rule.CreatedAt.getTime();
}
