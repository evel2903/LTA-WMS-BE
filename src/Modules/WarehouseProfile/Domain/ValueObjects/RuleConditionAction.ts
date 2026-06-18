/**
 * V0 condition/action JSON schema contract.
 *
 * This is the single source of truth for the operator / comparator / action-type
 * vocabularies. B3's evaluator MUST import these sets rather than redefining them.
 * B2 only validates the SHAPE of condition_json / action_json; it does NOT evaluate.
 */

export const RuleConditionOperators = ['ALL', 'ANY', 'NONE'] as const;
export type RuleConditionOperator = (typeof RuleConditionOperators)[number];

export const RulePredicateComparators = ['EQ', 'NE', 'IN', 'GT', 'LT', 'EXISTS'] as const;
export type RulePredicateComparator = (typeof RulePredicateComparators)[number];

export const RuleActionTypes = ['BLOCK', 'REQUIRE_APPROVAL', 'WARN', 'SUGGEST', 'SET_FLAG'] as const;
export type RuleActionType = (typeof RuleActionTypes)[number];

export interface RulePredicate {
  Field: string;
  Comparator: RulePredicateComparator;
  Value: unknown;
}

/**
 * A condition is either an empty object (wildcard / always matches) or a typed object
 * with an Operator and an array of Predicates.
 */
export type RuleCondition = Record<string, never> | { Operator: RuleConditionOperator; Predicates: RulePredicate[] };

/**
 * An action is either an empty object (no-op) or a typed object with a Type and optional Params.
 */
export type RuleAction = Record<string, never> | { Type: RuleActionType; Params?: Record<string, unknown> };
