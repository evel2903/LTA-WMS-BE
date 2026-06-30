import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';

export class LocationOrmMapper {
  public static ToDomain(entity: LocationOrmEntity): LocationEntity {
    return new LocationEntity({
      Id: entity.Id,
      WarehouseId: entity.WarehouseId,
      ZoneId: entity.ZoneId,
      ParentLocationId: entity.ParentLocationId,
      LocationCode: entity.LocationCode,
      LocationName: entity.LocationName,
      LocationType: entity.LocationType,
      LocationProfileId: entity.LocationProfileId,
      LocationStatus: entity.LocationStatus as LocationStatus,
      CapacityQty: LocationOrmMapper.ToNumberOrNull(entity.CapacityQty),
      CapacityVolume: LocationOrmMapper.ToNumberOrNull(entity.CapacityVolume),
      CapacityWeight: LocationOrmMapper.ToNumberOrNull(entity.CapacityWeight),
      AisleCode: entity.AisleCode,
      RackCode: entity.RackCode,
      LevelCode: entity.LevelCode,
      BinCode: entity.BinCode,
      PalletSlot: entity.PalletSlot,
      TemperatureClass: entity.TemperatureClass,
      DgCompatibilityGroup: entity.DgCompatibilityGroup,
      BondedFlag: entity.BondedFlag,
      OwnerRestriction: entity.OwnerRestriction,
      MixSkuPolicy: entity.MixSkuPolicy,
      MixLotPolicy: entity.MixLotPolicy,
      MixOwnerPolicy: entity.MixOwnerPolicy,
      PickSequence: entity.PickSequence,
      PutawaySequence: entity.PutawaySequence,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: LocationEntity): LocationOrmEntity {
    const orm = new LocationOrmEntity();
    orm.Id = entity.Id;
    orm.WarehouseId = entity.WarehouseId;
    orm.ZoneId = entity.ZoneId;
    orm.ParentLocationId = entity.ParentLocationId;
    orm.LocationCode = entity.LocationCode;
    orm.LocationName = entity.LocationName;
    orm.LocationType = entity.LocationType;
    orm.LocationProfileId = entity.LocationProfileId;
    orm.LocationStatus = entity.LocationStatus;
    orm.CapacityQty = entity.CapacityQty;
    orm.CapacityVolume = entity.CapacityVolume;
    orm.CapacityWeight = entity.CapacityWeight;
    orm.AisleCode = entity.AisleCode;
    orm.RackCode = entity.RackCode;
    orm.LevelCode = entity.LevelCode;
    orm.BinCode = entity.BinCode;
    orm.PalletSlot = entity.PalletSlot;
    orm.TemperatureClass = entity.TemperatureClass;
    orm.DgCompatibilityGroup = entity.DgCompatibilityGroup;
    orm.BondedFlag = entity.BondedFlag;
    orm.OwnerRestriction = entity.OwnerRestriction;
    orm.MixSkuPolicy = entity.MixSkuPolicy;
    orm.MixLotPolicy = entity.MixLotPolicy;
    orm.MixOwnerPolicy = entity.MixOwnerPolicy;
    orm.PickSequence = entity.PickSequence;
    orm.PutawaySequence = entity.PutawaySequence;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }

  private static ToNumberOrNull(value: number | string | null): number | null {
    if (value === null) {
      return null;
    }
    return typeof value === 'number' ? value : Number(value);
  }
}
