import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import { LocationTreeDto } from '@modules/MasterData/Application/DTOs/LocationTreeDto';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';

export class LocationDtoMapper {
  public static ToDto(entity: LocationEntity): LocationDto {
    return {
      Id: entity.Id,
      WarehouseId: entity.WarehouseId,
      ZoneId: entity.ZoneId,
      ParentLocationId: entity.ParentLocationId,
      LocationCode: entity.LocationCode,
      LocationName: entity.LocationName,
      LocationType: entity.LocationType,
      LocationProfileId: entity.LocationProfileId,
      LocationStatus: entity.LocationStatus,
      CapacityQty: entity.CapacityQty,
      CapacityVolume: entity.CapacityVolume,
      CapacityWeight: entity.CapacityWeight,
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
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }

  public static ToTreeDto(entity: LocationEntity, children: LocationTreeDto[] = []): LocationTreeDto {
    return {
      Id: entity.Id,
      WarehouseId: entity.WarehouseId,
      ZoneId: entity.ZoneId,
      ParentLocationId: entity.ParentLocationId,
      LocationCode: entity.LocationCode,
      LocationName: entity.LocationName,
      LocationType: entity.LocationType,
      LocationProfileId: entity.LocationProfileId,
      LocationStatus: entity.LocationStatus,
      AisleCode: entity.AisleCode,
      RackCode: entity.RackCode,
      LevelCode: entity.LevelCode,
      BinCode: entity.BinCode,
      Children: children,
    };
  }
}
