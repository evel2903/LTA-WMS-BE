import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
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
 * C5: the immutable audit record is written in the same transaction (auditedTransaction is optional
 * only so fixture-setup tests construct bare; the module always wires it).
 */
export class DeactivateWarehouseProfileUseCase {
  constructor(
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: DeactivateWarehouseProfileDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WarehouseProfileDto> {
    const profile = await this.profileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    if (profile.Status !== WarehouseProfileStatus.Active) {
      throw new BusinessRuleException(`Cannot deactivate a profile in status ${profile.Status}`);
    }
    const before = WarehouseProfileDtoMapper.ToDto(profile) as unknown as Record<string, unknown>;

    const now = new Date();
    profile.Status = WarehouseProfileStatus.Retired;
    this.RecordDeactivationContext(profile, request, now);
    if (request.ActorUserId != null) {
      profile.UpdatedBy = request.ActorUserId;
    }
    profile.UpdatedAt = now;

    const buildEntry = (updated: WarehouseProfileEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectId: updated.Id,
        ObjectCode: updated.ProfileCode,
        BeforeJson: before,
        AfterJson: WarehouseProfileDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonNote: request.ReasonNote ?? request.ReasonCode ?? null,
        WarehouseId: updated.WarehouseId ?? null,
      });

    if (!this.auditedTransaction) {
      const updated = await this.profileRepository.Update(profile);
      return WarehouseProfileDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.profileRepository.Update(profile, manager);
      return { result: WarehouseProfileDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
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
