import { BusinessRuleException } from '@common/Exceptions/AppException';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export type GoodsIssueTrigger = 'at_loading' | 'at_gate_out';

export const DEFAULT_GOODS_ISSUE_TRIGGER: GoodsIssueTrigger = 'at_loading';

export class GoodsIssueTriggerPolicy {
  public Resolve(strategyPolicy?: PolicyConfig | null): GoodsIssueTrigger {
    const value = strategyPolicy?.goodsIssueTrigger;
    if (value === undefined || value === null) {
      return DEFAULT_GOODS_ISSUE_TRIGGER;
    }
    if (value === 'at_loading' || value === 'at_gate_out') {
      return value;
    }
    throw new BusinessRuleException('StrategyPolicy.goodsIssueTrigger must be at_loading or at_gate_out');
  }
}
