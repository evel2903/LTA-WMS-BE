import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { CreateLocationProfileDto } from '@modules/MasterData/Application/DTOs/CreateLocationProfileDto';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateLocationProfileUseCase {
  constructor(private readonly locationProfileRepository: ILocationProfileRepository) {}

  public async Execute(request: CreateLocationProfileDto): Promise<LocationProfileDto> {
    if (request.Status === MasterDataStatus.Active && request.LocationType.trim().length === 0) {
      throw new BusinessRuleException('Active location profile requires LocationType');
    }

    const existing = await this.locationProfileRepository.FindByCode(request.ProfileCode);
    if (existing) {
      throw new ConflictException('Location profile code already exists');
    }

    const now = new Date();
    const profile = new LocationProfileEntity({
      Id: randomUUID(),
      ProfileCode: request.ProfileCode,
      ProfileName: request.ProfileName,
      LocationType: request.LocationType,
      Version: 1,
      Status: request.Status,
      CapacityPolicy: request.CapacityPolicy ?? {},
      EligibilityPolicy: request.EligibilityPolicy ?? {},
      MixPolicy: request.MixPolicy ?? {},
      CompliancePolicy: request.CompliancePolicy ?? {},
      OperationPolicy: request.OperationPolicy ?? {},
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.locationProfileRepository.Create(profile);
    return LocationProfileDtoMapper.ToDto(created);
  }
}
