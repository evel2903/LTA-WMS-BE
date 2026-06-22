import { BusinessRuleException } from '@common/Exceptions/AppException';
import {
  DEFAULT_GOODS_ISSUE_TRIGGER,
  GoodsIssueTriggerPolicy,
} from '@modules/WarehouseProfile/Application/Services/GoodsIssueTriggerPolicy';

describe('GoodsIssueTriggerPolicy', () => {
  it('defaults to at_loading when StrategyPolicy omits goodsIssueTrigger', () => {
    const policy = new GoodsIssueTriggerPolicy();

    expect(policy.Resolve({})).toBe(DEFAULT_GOODS_ISSUE_TRIGGER);
    expect(policy.Resolve(undefined)).toBe(DEFAULT_GOODS_ISSUE_TRIGGER);
  });

  it('accepts at_loading and at_gate_out when configured', () => {
    const policy = new GoodsIssueTriggerPolicy();

    expect(policy.Resolve({ goodsIssueTrigger: 'at_loading' })).toBe('at_loading');
    expect(policy.Resolve({ goodsIssueTrigger: 'at_gate_out' })).toBe('at_gate_out');
  });

  it('rejects unsupported goodsIssueTrigger values', () => {
    const policy = new GoodsIssueTriggerPolicy();

    expect(() => policy.Resolve({ goodsIssueTrigger: 'goods_issue_posted' })).toThrow(BusinessRuleException);
    expect(() => policy.Resolve({ goodsIssueTrigger: '' })).toThrow(BusinessRuleException);
  });
});
