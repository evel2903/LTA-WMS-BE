import { BusinessRuleException } from '@common/Exceptions/AppException';
import { RulePayloadValidator } from '@modules/WarehouseProfile/Application/Services/RulePayloadValidator';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';

describe('RulePayloadValidator', () => {
  const validator = new RulePayloadValidator();

  describe('ValidateCondition', () => {
    it('accepts an empty object as a wildcard condition', () => {
      expect(validator.ValidateCondition({})).toEqual({});
    });

    it('accepts undefined and normalizes to empty wildcard condition', () => {
      expect(validator.ValidateCondition(undefined)).toEqual({});
    });

    it('accepts a well-formed condition with operator and predicates', () => {
      const condition = {
        Operator: 'ALL',
        Predicates: [{ Field: 'OwnerId', Comparator: 'EQ', Value: 'owner-1' }],
      };
      expect(validator.ValidateCondition(condition)).toEqual(condition);
    });

    it('rejects a condition that is an array', () => {
      expect(() => validator.ValidateCondition([])).toThrow(BusinessRuleException);
    });

    it('rejects a condition that is a primitive', () => {
      expect(() => validator.ValidateCondition('ALL' as unknown)).toThrow(BusinessRuleException);
    });

    it('rejects an operator outside the allowed set', () => {
      expect(() => validator.ValidateCondition({ Operator: 'MOST', Predicates: [] })).toThrow(/Operator/);
    });

    it('rejects predicates that is not an array', () => {
      expect(() => validator.ValidateCondition({ Operator: 'ALL', Predicates: {} })).toThrow(/Predicates/);
    });

    it('rejects a predicate with an empty Field', () => {
      expect(() =>
        validator.ValidateCondition({
          Operator: 'ALL',
          Predicates: [{ Field: '', Comparator: 'EQ', Value: 1 }],
        }),
      ).toThrow(/Field/);
    });

    it('rejects a predicate comparator outside the allowed set', () => {
      expect(() =>
        validator.ValidateCondition({
          Operator: 'ALL',
          Predicates: [{ Field: 'Qty', Comparator: 'BETWEEN', Value: 1 }],
        }),
      ).toThrow(/Comparator/);
    });

    it('rejects an operator without predicates array', () => {
      expect(() => validator.ValidateCondition({ Operator: 'ALL' })).toThrow(/Predicates/);
    });
  });

  describe('ValidateAction', () => {
    it('accepts an empty object as a no-op action', () => {
      expect(validator.ValidateAction({})).toEqual({});
    });

    it('accepts undefined and normalizes to empty action', () => {
      expect(validator.ValidateAction(undefined)).toEqual({});
    });

    it('accepts a well-formed action with type and params', () => {
      const action = { Type: 'BLOCK', Params: { Message: 'no' } };
      expect(validator.ValidateAction(action)).toEqual(action);
    });

    it('rejects an action that is an array', () => {
      expect(() => validator.ValidateAction([])).toThrow(BusinessRuleException);
    });

    it('rejects an action Type outside the allowed set', () => {
      expect(() => validator.ValidateAction({ Type: 'EXPLODE' })).toThrow(/Type/);
    });

    it('rejects an empty action Type', () => {
      expect(() => validator.ValidateAction({ Type: '' })).toThrow(/Type/);
    });

    it('rejects action Params that is not an object', () => {
      expect(() => validator.ValidateAction({ Type: 'WARN', Params: [] })).toThrow(/Params/);
    });
  });

  describe('enum assertions', () => {
    it('accepts a valid precedence tier and returns it', () => {
      expect(validator.AssertPrecedenceTier('COMPLIANCE')).toBe(RulePrecedenceTier.Compliance);
    });

    it('rejects an unknown precedence tier', () => {
      expect(() => validator.AssertPrecedenceTier('SUPER')).toThrow(/PrecedenceTier/);
    });

    it('accepts a valid control mode and returns it', () => {
      expect(validator.AssertControlMode('HARD_BLOCK')).toBe(RuleControlMode.HardBlock);
    });

    it('rejects an unknown control mode', () => {
      expect(() => validator.AssertControlMode('SOFT_LOCK')).toThrow(/ControlMode/);
    });

    it('accepts a valid status and returns it', () => {
      expect(validator.AssertStatus('ACTIVE')).toBe(RuleStatus.Active);
    });

    it('rejects an unknown status', () => {
      expect(() => validator.AssertStatus('PURGED')).toThrow(/Status/);
    });
  });
});
