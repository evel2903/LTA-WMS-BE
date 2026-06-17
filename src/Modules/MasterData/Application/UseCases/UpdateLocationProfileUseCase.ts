import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateLocationProfileDto } from '@modules/MasterData/Application/DTOs/UpdateLocationProfileDto';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateLocationProfileUseCase {
  constructor(private readonly locationProfileRepository: ILocationProfileRepository) {}

  public async Execute(request: UpdateLocationProfileDto): Promise<LocationProfileDto> {
    const profile = await this.locationProfileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Location profile not found');
    }

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

    const updated = await this.locationProfileRepository.Update(profile);
    return LocationProfileDtoMapper.ToDto(updated);
  }
}
