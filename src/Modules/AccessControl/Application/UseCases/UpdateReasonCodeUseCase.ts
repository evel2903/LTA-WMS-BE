import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { UpdateReasonCodeDto, ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';
import { ReasonCodeDtoMapper } from '@modules/AccessControl/Application/Mappers/ReasonCodeDtoMapper';
import { ReasonCodePayloadValidator } from '@modules/AccessControl/Application/Services/ReasonCodePayloadValidator';

/**
 * PATCH with OMIT semantics: undefined fields are unchanged. `Status` may be set to
 * INACTIVE to deactivate a code (it stays readable for audit history; it is never
 * hard-deleted). `reason_code` and `reason_group` identity are not re-keyable here.
 */
export class UpdateReasonCodeUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. ReasonCode is AUDIT-ONLY (no ownership group), so
  // there is no ownership policy or reason-code handling here.
  constructor(
    private readonly reasonCodeRepository: IReasonCodeRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateReasonCodeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ReasonCodeDto> {
    const reason = await this.reasonCodeRepository.FindById(request.Id);
    if (!reason) {
      throw new NotFoundException('Reason code not found');
    }
    const before = ReasonCodeDtoMapper.ToDto(reason) as unknown as Record<string, unknown>;

    if (request.ReasonGroup !== undefined) reason.ReasonGroup = request.ReasonGroup;
    if (request.Description !== undefined) reason.Description = request.Description;
    // Non-nullable jsonb columns: an explicit null is treated as "no change" (never persisted as null).
    if (request.AppliesToActions != null) reason.AppliesToActions = request.AppliesToActions;
    if (request.AppliesToObjects != null) reason.AppliesToObjects = request.AppliesToObjects;
    if (request.EvidenceRequired !== undefined) reason.EvidenceRequired = request.EvidenceRequired;
    if (request.ApprovalRequired !== undefined) reason.ApprovalRequired = request.ApprovalRequired;
    if (request.AllowedRoleCodes !== undefined) reason.AllowedRoleCodes = request.AllowedRoleCodes;
    if (request.Status !== undefined) reason.Status = request.Status;
    if (request.EffectiveFrom !== undefined) {
      reason.EffectiveFrom = request.EffectiveFrom != null ? new Date(request.EffectiveFrom) : null;
    }
    if (request.EffectiveTo !== undefined) {
      reason.EffectiveTo = request.EffectiveTo != null ? new Date(request.EffectiveTo) : null;
    }

    ReasonCodePayloadValidator.Validate({
      AppliesToActions: reason.AppliesToActions,
      AppliesToObjects: reason.AppliesToObjects,
      AllowedRoleCodes: reason.AllowedRoleCodes,
      EffectiveFrom: reason.EffectiveFrom,
      EffectiveTo: reason.EffectiveTo,
    });

    reason.Version += 1;
    reason.UpdatedAt = new Date();
    reason.UpdatedBy = request.ActorUserId ?? reason.UpdatedBy;

    const buildEntry = (updated: ReasonCodeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.ReasonCode,
        ObjectId: updated.Id,
        ObjectCode: updated.ReasonCode,
        BeforeJson: before,
        AfterJson: ReasonCodeDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.reasonCodeRepository.Update(reason);
      return ReasonCodeDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.reasonCodeRepository.Update(reason, manager);
      return { result: ReasonCodeDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
