import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { CreateReasonCodeDto, ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';
import { ReasonCodeDtoMapper } from '@modules/AccessControl/Application/Mappers/ReasonCodeDtoMapper';
import { ReasonCodePayloadValidator } from '@modules/AccessControl/Application/Services/ReasonCodePayloadValidator';

export class CreateReasonCodeUseCase {
  constructor(private readonly reasonCodeRepository: IReasonCodeRepository) {}

  public async Execute(request: CreateReasonCodeDto): Promise<ReasonCodeDto> {
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
    const created = await this.reasonCodeRepository.Create(
      new ReasonCodeEntity({
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
      }),
    );
    return ReasonCodeDtoMapper.ToDto(created);
  }
}
