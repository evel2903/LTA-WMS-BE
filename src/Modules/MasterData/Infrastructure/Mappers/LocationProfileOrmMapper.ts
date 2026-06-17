import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';

export class LocationProfileOrmMapper {
  public static ToDomain(entity: LocationProfileOrmEntity): LocationProfileEntity {
    return new LocationProfileEntity({
      Id: entity.Id,
      ProfileCode: entity.ProfileCode,
      ProfileName: entity.ProfileName,
      LocationType: entity.LocationType,
      Version: entity.Version,
      Status: entity.Status as MasterDataStatus,
      CapacityPolicy: entity.CapacityPolicy,
      EligibilityPolicy: entity.EligibilityPolicy,
      MixPolicy: entity.MixPolicy,
      CompliancePolicy: entity.CompliancePolicy,
      OperationPolicy: entity.OperationPolicy,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: LocationProfileEntity): LocationProfileOrmEntity {
    const orm = new LocationProfileOrmEntity();
    orm.Id = entity.Id;
    orm.ProfileCode = entity.ProfileCode;
    orm.ProfileName = entity.ProfileName;
    orm.LocationType = entity.LocationType;
    orm.Version = entity.Version;
    orm.Status = entity.Status;
    orm.CapacityPolicy = entity.CapacityPolicy;
    orm.EligibilityPolicy = entity.EligibilityPolicy;
    orm.MixPolicy = entity.MixPolicy;
    orm.CompliancePolicy = entity.CompliancePolicy;
    orm.OperationPolicy = entity.OperationPolicy;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
