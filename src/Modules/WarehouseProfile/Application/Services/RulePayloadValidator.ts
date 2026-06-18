import { BusinessRuleException } from '@common/Exceptions/AppException';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import {
  RuleAction,
  RuleActionTypes,
  RuleCondition,
  RuleConditionOperators,
  RulePredicateComparators,
} from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

/**
 * Validates the SHAPE of rule condition/action JSON (the B3 contract) and the rule
 * classification enums. B2 only validates; it never evaluates conditions or resolves actions.
 */
export class RulePayloadValidator {
  public ValidateCondition(value: unknown): RuleCondition {
    const object = this.AsObject(value, 'ConditionJson');
    if (object === null) {
      return {};
    }
    if (Object.keys(object).length === 0) {
      return {};
    }

    const operator = object.Operator;
    if (typeof operator !== 'string' || !(RuleConditionOperators as readonly string[]).includes(operator)) {
      throw new BusinessRuleException(`ConditionJson.Operator must be one of ${RuleConditionOperators.join(', ')}`);
    }

    const predicates = object.Predicates;
    if (!Array.isArray(predicates)) {
      throw new BusinessRuleException('ConditionJson.Predicates must be an array');
    }

    predicates.forEach((predicate, index) => this.ValidatePredicate(predicate, index));

    return object as RuleCondition;
  }

  public ValidateAction(value: unknown): RuleAction {
    const object = this.AsObject(value, 'ActionJson');
    if (object === null) {
      return {};
    }
    if (Object.keys(object).length === 0) {
      return {};
    }

    const type = object.Type;
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new BusinessRuleException('ActionJson.Type must be a non-empty string');
    }
    if (!(RuleActionTypes as readonly string[]).includes(type)) {
      throw new BusinessRuleException(`ActionJson.Type must be one of ${RuleActionTypes.join(', ')}`);
    }

    const params = object.Params;
    if (params !== undefined && (params === null || typeof params !== 'object' || Array.isArray(params))) {
      throw new BusinessRuleException('ActionJson.Params must be a JSON object when present');
    }

    return object as RuleAction;
  }

  public AssertPrecedenceTier(value: unknown): RulePrecedenceTier {
    if (typeof value === 'string' && (Object.values(RulePrecedenceTier) as string[]).includes(value)) {
      return value as RulePrecedenceTier;
    }
    throw new BusinessRuleException(`PrecedenceTier must be one of ${Object.values(RulePrecedenceTier).join(', ')}`);
  }

  public AssertControlMode(value: unknown): RuleControlMode {
    if (typeof value === 'string' && (Object.values(RuleControlMode) as string[]).includes(value)) {
      return value as RuleControlMode;
    }
    throw new BusinessRuleException(`ControlMode must be one of ${Object.values(RuleControlMode).join(', ')}`);
  }

  public AssertStatus(value: unknown): RuleStatus {
    if (typeof value === 'string' && (Object.values(RuleStatus) as string[]).includes(value)) {
      return value as RuleStatus;
    }
    throw new BusinessRuleException(`Status must be one of ${Object.values(RuleStatus).join(', ')}`);
  }

  public AssertEffectiveWindow(effectiveFrom: Date, effectiveTo: Date | null): void {
    if (effectiveTo !== null && effectiveTo.getTime() <= effectiveFrom.getTime()) {
      throw new BusinessRuleException('EffectiveTo must be greater than EffectiveFrom');
    }
  }

  private ValidatePredicate(predicate: unknown, index: number): void {
    if (predicate === null || typeof predicate !== 'object' || Array.isArray(predicate)) {
      throw new BusinessRuleException(`ConditionJson.Predicates[${index}] must be a JSON object`);
    }
    const record = predicate as Record<string, unknown>;
    if (typeof record.Field !== 'string' || record.Field.trim().length === 0) {
      throw new BusinessRuleException(`ConditionJson.Predicates[${index}].Field must be a non-empty string`);
    }
    const comparator = record.Comparator;
    if (typeof comparator !== 'string' || !(RulePredicateComparators as readonly string[]).includes(comparator)) {
      throw new BusinessRuleException(
        `ConditionJson.Predicates[${index}].Comparator must be one of ${RulePredicateComparators.join(', ')}`,
      );
    }
  }

  /**
   * Returns the value as a plain object, `null` if the input is undefined/null (caller
   * normalizes to wildcard), and throws if it is a non-object or an array.
   */
  private AsObject(value: unknown, label: string): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BusinessRuleException(`${label} must be a JSON object`);
    }
    return value as Record<string, unknown>;
  }
}
