import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { DeactivateWarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/DeactivateWarehouseProfileDto';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

/**
 * B5 deactivation use case (pure class; wired via useFactory). Moves ACTIVE -> RETIRED (V0 has no
 * ACTIVE -> DRAFT path). Only an ACTIVE profile can be deactivated; anything else is an invalid
 * transition (BusinessRuleException). Stores deactivation actor/reason context
 * (audit_policy.LastDeactivation) for C5; this is context, NOT an immutable audit trail.
 */
export class DeactivateWarehouseProfileUseCase {
  constructor(private readonly profileRepository: IWarehouseProfileRepository) {}

  public async Execute(request: DeactivateWarehouseProfileDto): Promise<WarehouseProfileDto> {
    const profile = await this.profileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    if (profile.Status !== WarehouseProfileStatus.Active) {
      throw new BusinessRuleException(`Cannot deactivate a profile in status ${profile.Status}`);
    }

    const now = new Date();
    profile.Status = WarehouseProfileStatus.Retired;
    this.RecordDeactivationContext(profile, request, now);
    if (request.ActorUserId != null) {
      profile.UpdatedBy = request.ActorUserId;
    }
    profile.UpdatedAt = now;

    const updated = await this.profileRepository.Update(profile);
    return WarehouseProfileDtoMapper.ToDto(updated);
  }

  private RecordDeactivationContext(
    profile: WarehouseProfileEntity,
    request: DeactivateWarehouseProfileDto,
    now: Date,
  ): void {
    profile.AuditPolicy = {
      ...profile.AuditPolicy,
      LastDeactivation: {
        ActorUserId: request.ActorUserId ?? null,
        ReasonCode: request.ReasonCode ?? null,
        ReasonNote: request.ReasonNote ?? null,
        DeactivatedAt: now.toISOString(),
      },
    };
  }
}
