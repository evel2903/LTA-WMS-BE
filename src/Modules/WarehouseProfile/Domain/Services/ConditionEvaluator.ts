import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import {
  RuleCondition,
  RulePredicate,
  RulePredicateComparator,
} from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

/**
 * Pure Domain service: evaluates a condition_json (shape already validated in B2) against the
 * runtime context. It reuses the operator/comparator vocabulary from RuleConditionAction (B2
 * contract) and does NOT redefine it. No I/O.
 *
 * Comparator semantics (documented contract for B4/V1+ consistency):
 *   - EQ / NE: strict (===) equality of the context field vs the predicate Value.
 *   - IN: predicate Value must be an array; matches when it includes the context field.
 *   - GT / LT: numeric only; non-numeric operands never match.
 *   - EXISTS: Value truthy asserts the field is present and non-null; Value falsy asserts absence.
 *
 * Field resolution: a predicate's `Field` is read from context.Attributes (business data),
 * never from the six scope axes (those are handled by the resolver's scope-match step).
 */
export class ConditionEvaluator {
  public Matches(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    if (!('Operator' in condition)) {
      // Empty object {} is a wildcard condition that always matches.
      return true;
    }

    // B2's RulePayloadValidator guarantees a typed condition carries a Predicates array. Guard
    // defensively against a malformed condition (e.g. a B4 preview payload that skipped B2
    // validation) so the evaluator never throws on a missing/non-array Predicates field.
    const predicates = Array.isArray(condition.Predicates) ? condition.Predicates : [];
    switch (condition.Operator) {
      case 'ALL':
        return predicates.every((predicate) => this.EvaluatePredicate(predicate, context));
      case 'ANY':
        return predicates.some((predicate) => this.EvaluatePredicate(predicate, context));
      case 'NONE':
        return !predicates.some((predicate) => this.EvaluatePredicate(predicate, context));
    }
  }

  private EvaluatePredicate(predicate: RulePredicate, context: RuleEvaluationContext): boolean {
    const attributes = context.Attributes ?? {};
    const actual = attributes[predicate.Field];
    return this.Compare(predicate.Comparator, actual, predicate.Value);
  }

  private Compare(comparator: RulePredicateComparator, actual: unknown, expected: unknown): boolean {
    switch (comparator) {
      case 'EQ':
        return actual === expected;
      case 'NE':
        return actual !== expected;
      case 'IN':
        return Array.isArray(expected) && expected.includes(actual);
      case 'GT':
        return this.IsNumber(actual) && this.IsNumber(expected) && actual > expected;
      case 'LT':
        return this.IsNumber(actual) && this.IsNumber(expected) && actual < expected;
      case 'EXISTS': {
        const present = actual !== undefined && actual !== null;
        return expected ? present : !present;
      }
    }
  }

  private IsNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value);
  }
}
