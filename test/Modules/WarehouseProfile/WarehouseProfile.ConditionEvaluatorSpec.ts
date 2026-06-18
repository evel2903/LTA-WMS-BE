import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

const baseContext = (attributes: Record<string, unknown> = {}): RuleEvaluationContext => ({
  WarehouseTypeCode: 'TIER_1',
  EvaluatedAt: new Date('2026-06-01T00:00:00.000Z'),
  Attributes: attributes,
});

describe('ConditionEvaluator (B3 evaluates value; B2 validated shape)', () => {
  const evaluator = new ConditionEvaluator();

  it('treats an empty condition object as always matching (wildcard)', () => {
    expect(evaluator.Matches({}, baseContext())).toBe(true);
  });

  it('reads predicate Field from context.Attributes', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Temperature', Comparator: 'EQ', Value: 4 }],
    };
    expect(evaluator.Matches(condition, baseContext({ Temperature: 4 }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ Temperature: 5 }))).toBe(false);
  });

  it('ALL requires every predicate true', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [
        { Field: 'A', Comparator: 'EQ', Value: 1 },
        { Field: 'B', Comparator: 'EQ', Value: 2 },
      ],
    };
    expect(evaluator.Matches(condition, baseContext({ A: 1, B: 2 }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ A: 1, B: 99 }))).toBe(false);
  });

  it('ANY requires at least one predicate true', () => {
    const condition: RuleCondition = {
      Operator: 'ANY',
      Predicates: [
        { Field: 'A', Comparator: 'EQ', Value: 1 },
        { Field: 'B', Comparator: 'EQ', Value: 2 },
      ],
    };
    expect(evaluator.Matches(condition, baseContext({ A: 1, B: 99 }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ A: 99, B: 99 }))).toBe(false);
  });

  it('NONE requires every predicate false', () => {
    const condition: RuleCondition = {
      Operator: 'NONE',
      Predicates: [{ Field: 'A', Comparator: 'EQ', Value: 1 }],
    };
    expect(evaluator.Matches(condition, baseContext({ A: 2 }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ A: 1 }))).toBe(false);
  });

  it('evaluates EQ and NE', () => {
    const eq: RuleCondition = { Operator: 'ALL', Predicates: [{ Field: 'X', Comparator: 'EQ', Value: 'A' }] };
    const ne: RuleCondition = { Operator: 'ALL', Predicates: [{ Field: 'X', Comparator: 'NE', Value: 'A' }] };
    expect(evaluator.Matches(eq, baseContext({ X: 'A' }))).toBe(true);
    expect(evaluator.Matches(eq, baseContext({ X: 'B' }))).toBe(false);
    expect(evaluator.Matches(ne, baseContext({ X: 'B' }))).toBe(true);
    expect(evaluator.Matches(ne, baseContext({ X: 'A' }))).toBe(false);
  });

  it('evaluates IN against an array Value', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Class', Comparator: 'IN', Value: ['DRY', 'COLD'] }],
    };
    expect(evaluator.Matches(condition, baseContext({ Class: 'COLD' }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ Class: 'HAZMAT' }))).toBe(false);
  });

  it('IN against a non-array Value never matches', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Class', Comparator: 'IN', Value: 'DRY' }],
    };
    expect(evaluator.Matches(condition, baseContext({ Class: 'DRY' }))).toBe(false);
  });

  it('evaluates GT and LT numerically', () => {
    const gt: RuleCondition = { Operator: 'ALL', Predicates: [{ Field: 'Qty', Comparator: 'GT', Value: 10 }] };
    const lt: RuleCondition = { Operator: 'ALL', Predicates: [{ Field: 'Qty', Comparator: 'LT', Value: 10 }] };
    expect(evaluator.Matches(gt, baseContext({ Qty: 11 }))).toBe(true);
    expect(evaluator.Matches(gt, baseContext({ Qty: 10 }))).toBe(false);
    expect(evaluator.Matches(lt, baseContext({ Qty: 9 }))).toBe(true);
    expect(evaluator.Matches(lt, baseContext({ Qty: 10 }))).toBe(false);
  });

  it('GT/LT with non-numeric operands never match', () => {
    const gt: RuleCondition = { Operator: 'ALL', Predicates: [{ Field: 'Qty', Comparator: 'GT', Value: 10 }] };
    expect(evaluator.Matches(gt, baseContext({ Qty: 'abc' }))).toBe(false);
  });

  it('evaluates EXISTS as presence of a non-null field', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Lot', Comparator: 'EXISTS', Value: true }],
    };
    expect(evaluator.Matches(condition, baseContext({ Lot: 'L1' }))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({}))).toBe(false);
  });

  it('EXISTS with Value=false asserts absence', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Lot', Comparator: 'EXISTS', Value: false }],
    };
    expect(evaluator.Matches(condition, baseContext({}))).toBe(true);
    expect(evaluator.Matches(condition, baseContext({ Lot: 'L1' }))).toBe(false);
  });

  it('treats an absent field as not-equal for EQ', () => {
    const condition: RuleCondition = {
      Operator: 'ALL',
      Predicates: [{ Field: 'Missing', Comparator: 'EQ', Value: 'X' }],
    };
    expect(evaluator.Matches(condition, baseContext({}))).toBe(false);
  });

  it('does not throw on a malformed condition missing Predicates (defensive for unvalidated B4 input)', () => {
    // {Operator:'ALL'} with no Predicates is outside the B2-validated contract; the guard treats a
    // missing/non-array Predicates as an empty list rather than throwing on predicates.every.
    const malformedAll = { Operator: 'ALL' } as unknown as RuleCondition;
    const malformedAny = { Operator: 'ANY' } as unknown as RuleCondition;
    const malformedNone = { Operator: 'NONE' } as unknown as RuleCondition;
    expect(() => evaluator.Matches(malformedAll, baseContext())).not.toThrow();
    // ALL/NONE over zero predicates are vacuously true; ANY over zero predicates is false.
    expect(evaluator.Matches(malformedAll, baseContext())).toBe(true);
    expect(evaluator.Matches(malformedNone, baseContext())).toBe(true);
    expect(evaluator.Matches(malformedAny, baseContext())).toBe(false);
  });
});
