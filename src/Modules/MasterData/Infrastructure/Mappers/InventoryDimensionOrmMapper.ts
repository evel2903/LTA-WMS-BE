import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';

export class InventoryDimensionOrmMapper {
  public static ToDomain(entity: InventoryDimensionOrmEntity): InventoryDimensionEntity {
    return new InventoryDimensionEntity({
      Id: entity.Id,
      OwnerId: entity.OwnerId,
      SkuId: entity.SkuId,
      WarehouseId: entity.WarehouseId,
      LocationId: entity.LocationId,
      InventoryStatusId: entity.InventoryStatusId,
      DimensionKeyHash: entity.DimensionKeyHash,
      UomId: entity.UomId,
      LpnCode: entity.LpnCode,
      LotNumber: entity.LotNumber,
      ExpiryDate: entity.ExpiryDate ? new Date(entity.ExpiryDate) : null,
      SerialNumber: entity.SerialNumber,
      ProductionDate: entity.ProductionDate ? new Date(entity.ProductionDate) : null,
      CountryOfOrigin: entity.CountryOfOrigin,
      CustomsStatus: entity.CustomsStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: InventoryDimensionEntity): InventoryDimensionOrmEntity {
    const orm = new InventoryDimensionOrmEntity();
    orm.Id = entity.Id;
    orm.OwnerId = entity.OwnerId;
    orm.SkuId = entity.SkuId;
    orm.WarehouseId = entity.WarehouseId;
    orm.LocationId = entity.LocationId;
    orm.InventoryStatusId = entity.InventoryStatusId;
    orm.DimensionKeyHash = entity.DimensionKeyHash;
    orm.UomId = entity.UomId;
    orm.LpnCode = entity.LpnCode;
    orm.LotNumber = entity.LotNumber;
    orm.ExpiryDate = entity.ExpiryDate;
    orm.SerialNumber = entity.SerialNumber;
    orm.ProductionDate = entity.ProductionDate;
    orm.CountryOfOrigin = entity.CountryOfOrigin;
    orm.CustomsStatus = entity.CustomsStatus;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
