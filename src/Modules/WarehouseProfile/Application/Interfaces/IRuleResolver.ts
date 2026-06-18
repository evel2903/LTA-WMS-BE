import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

export const RULE_RESOLVER = Symbol('IRuleResolver');

/**
 * Application port for the rule resolver engine (B3). B4/B5 inject RULE_RESOLVER to reuse
 * the single deterministic resolve path as the source of truth.
 */
export interface IRuleResolver {
  Resolve(context: RuleEvaluationContext): Promise<RuleDecision>;
}
