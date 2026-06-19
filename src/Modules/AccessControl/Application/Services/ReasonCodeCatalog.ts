import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';

/**
 * Catalog-backed reason validation. Deny (BusinessRuleException) when the code is
 * unknown, inactive, or does not apply to the (action, object). Active = Status ACTIVE
 * (effective window stored but not time-enforced in V0).
 */
export class ReasonCodeCatalog implements IReasonCodeCatalog {
  constructor(private readonly reasonCodeRepository: IReasonCodeRepository) {}

  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    const reason = await this.reasonCodeRepository.FindByCode(input.ReasonCode);
    if (!reason) {
      throw new BusinessRuleException(`Unknown reason code: ${input.ReasonCode}`);
    }
    if (!reason.IsActive()) {
      throw new BusinessRuleException(`Reason code is inactive: ${input.ReasonCode}`);
    }
    if (!reason.AppliesTo(input.Action, input.ObjectType)) {
      throw new BusinessRuleException(
        `Reason code ${input.ReasonCode} does not apply to ${input.Action} on ${input.ObjectType}`,
      );
    }
    return {
      ReasonCodeId: reason.Id,
      EvidenceRequired: reason.EvidenceRequired,
      ApprovalRequired: reason.ApprovalRequired,
    };
  }
}
