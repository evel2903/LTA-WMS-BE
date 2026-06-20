import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateReasonCodeDto, ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';
import { ReasonCodeDtoMapper } from '@modules/AccessControl/Application/Mappers/ReasonCodeDtoMapper';
import { ReasonCodePayloadValidator } from '@modules/AccessControl/Application/Services/ReasonCodePayloadValidator';

export class CreateReasonCodeUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. ReasonCode is AUDIT-ONLY (no ownership group), so
  // there is no ownership policy or reason-code handling here.
  constructor(
    private readonly reasonCodeRepository: IReasonCodeRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateReasonCodeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ReasonCodeDto> {
    const effectiveFrom = request.EffectiveFrom != null ? new Date(request.EffectiveFrom) : null;
    const effectiveTo = request.EffectiveTo != null ? new Date(request.EffectiveTo) : null;
    ReasonCodePayloadValidator.Validate({
      AppliesToActions: request.AppliesToActions,
      AppliesToObjects: request.AppliesToObjects,
      AllowedRoleCodes: request.AllowedRoleCodes ?? null,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: effectiveTo,
    });

    const existing = await this.reasonCodeRepository.FindByCode(request.ReasonCode);
    if (existing) {
      throw new ConflictException(`Reason code already exists: ${request.ReasonCode}`);
    }

    const now = new Date();
    const reasonCode = new ReasonCodeEntity({
      Id: randomUUID(),
      ReasonCode: request.ReasonCode,
      ReasonGroup: request.ReasonGroup,
      Description: request.Description ?? null,
      AppliesToActions: request.AppliesToActions,
      AppliesToObjects: request.AppliesToObjects,
      EvidenceRequired: request.EvidenceRequired ?? false,
      ApprovalRequired: request.ApprovalRequired ?? false,
      AllowedRoleCodes: request.AllowedRoleCodes ?? null,
      Status: ReasonCodeStatus.Active,
      Version: 1,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: effectiveTo,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.ActorUserId ?? null,
      UpdatedBy: null,
    });

    const buildEntry = (created: ReasonCodeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.ReasonCode,
        ObjectId: created.Id,
        ObjectCode: created.ReasonCode,
        AfterJson: ReasonCodeDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.reasonCodeRepository.Create(reasonCode);
      return ReasonCodeDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.reasonCodeRepository.Create(reasonCode, manager);
      return { result: ReasonCodeDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
