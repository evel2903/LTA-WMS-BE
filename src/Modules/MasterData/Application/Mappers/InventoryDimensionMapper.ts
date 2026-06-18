import { InventoryDimensionDto } from '@modules/MasterData/Application/DTOs/InventoryDimensionDto';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

export class InventoryDimensionMapper {
  public static ToDto(entity: InventoryDimensionEntity): InventoryDimensionDto {
    return {
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
      ExpiryDate: entity.ExpiryDate,
      SerialNumber: entity.SerialNumber,
      ProductionDate: entity.ProductionDate,
      CountryOfOrigin: entity.CountryOfOrigin,
      CustomsStatus: entity.CustomsStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
