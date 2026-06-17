import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';

export class LocationProfileDtoMapper {
  public static ToDto(entity: LocationProfileEntity): LocationProfileDto {
    return {
      Id: entity.Id,
      ProfileCode: entity.ProfileCode,
      ProfileName: entity.ProfileName,
      LocationType: entity.LocationType,
      Version: entity.Version,
      Status: entity.Status,
      CapacityPolicy: entity.CapacityPolicy,
      EligibilityPolicy: entity.EligibilityPolicy,
      MixPolicy: entity.MixPolicy,
      CompliancePolicy: entity.CompliancePolicy,
      OperationPolicy: entity.OperationPolicy,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
