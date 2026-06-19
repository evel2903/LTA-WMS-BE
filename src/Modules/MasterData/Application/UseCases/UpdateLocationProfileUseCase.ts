import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { UpdateLocationProfileDto } from '@modules/MasterData/Application/DTOs/UpdateLocationProfileDto';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateLocationProfileUseCase {
  constructor(
    private readonly locationProfileRepository: ILocationProfileRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateLocationProfileDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<LocationProfileDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.LocationProfile,
        Action: ActionCode.Update,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    const profile = await this.locationProfileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Location profile not found');
    }
    const before = LocationProfileDtoMapper.ToDto(profile) as unknown as Record<string, unknown>;

    const targetProfileCode = request.ProfileCode ?? profile.ProfileCode;
    if (targetProfileCode !== profile.ProfileCode) {
      const duplicate = await this.locationProfileRepository.FindByCode(targetProfileCode);
      if (duplicate && duplicate.Id !== profile.Id) {
        throw new ConflictException('Location profile code already exists');
      }
    }

    const targetStatus = request.Status ?? profile.Status;
    const targetLocationType = request.LocationType ?? profile.LocationType;
    if (targetStatus === MasterDataStatus.Active && targetLocationType.trim().length === 0) {
      throw new BusinessRuleException('Active location profile requires LocationType');
    }

    profile.ProfileCode = targetProfileCode;
    profile.ProfileName = request.ProfileName ?? profile.ProfileName;
    profile.LocationType = targetLocationType;
    profile.Version = request.Version ?? profile.Version;
    profile.Status = targetStatus;
    profile.CapacityPolicy =
      request.CapacityPolicy !== undefined ? (request.CapacityPolicy ?? {}) : profile.CapacityPolicy;
    profile.EligibilityPolicy =
      request.EligibilityPolicy !== undefined ? (request.EligibilityPolicy ?? {}) : profile.EligibilityPolicy;
    profile.MixPolicy = request.MixPolicy !== undefined ? (request.MixPolicy ?? {}) : profile.MixPolicy;
    profile.CompliancePolicy =
      request.CompliancePolicy !== undefined ? (request.CompliancePolicy ?? {}) : profile.CompliancePolicy;
    profile.OperationPolicy =
      request.OperationPolicy !== undefined ? (request.OperationPolicy ?? {}) : profile.OperationPolicy;
    profile.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : profile.SourceSystem;
    profile.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : profile.ReferenceId;
    profile.UpdatedAt = new Date();

    const buildEntry = (updated: LocationProfileEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.LocationProfile,
        ObjectId: updated.Id,
        ObjectCode: updated.ProfileCode,
        BeforeJson: before,
        AfterJson: LocationProfileDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.locationProfileRepository.Update(profile);
      return LocationProfileDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.locationProfileRepository.Update(profile, manager);
      return { result: LocationProfileDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
