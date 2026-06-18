import { BusinessRuleException } from '@common/Exceptions/AppException';
import { PolicyConfig, ProfilePolicyKey } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class WarehouseProfilePolicyValidator {
  /**
   * A config policy must be a plain JSON object (not array, not primitive, not null when provided).
   */
  public ValidatePolicyShape(key: ProfilePolicyKey, value: unknown): PolicyConfig {
    if (value === undefined) {
      return {};
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BusinessRuleException(`${key} must be a JSON object`);
    }
    return value as PolicyConfig;
  }

  public AssertWarehouseTypeCode(warehouseTypeCode: string | null | undefined): string {
    if (typeof warehouseTypeCode !== 'string' || warehouseTypeCode.trim().length === 0) {
      throw new BusinessRuleException('WarehouseTypeCode is required');
    }
    return warehouseTypeCode.trim();
  }

  public AssertEffectiveWindow(effectiveFrom: Date, effectiveTo: Date | null): void {
    if (effectiveTo !== null && effectiveTo.getTime() <= effectiveFrom.getTime()) {
      throw new BusinessRuleException('EffectiveTo must be greater than EffectiveFrom');
    }
  }

  /**
   * Minimum scope readiness for a profile heading toward activation (B5 enforces activation;
   * B1 only validates that the required scope axis is present and non-blank).
   */
  public AssertScopeReadiness(scope: { WarehouseTypeCode: string | null | undefined }): void {
    this.AssertWarehouseTypeCode(scope.WarehouseTypeCode);
  }
}
