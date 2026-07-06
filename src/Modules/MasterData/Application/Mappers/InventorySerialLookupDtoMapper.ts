import { InventorySerialLookupDto } from '@modules/MasterData/Application/DTOs/InventorySerialLookupDto';
import { InventorySerialLookupRow } from '@modules/MasterData/Application/Interfaces/IInventorySerialLookupRepository';

export class InventorySerialLookupDtoMapper {
  public static ToDto(row: InventorySerialLookupRow): InventorySerialLookupDto {
    return {
      DimensionId: row.Dimension.Id,
      SkuId: row.Dimension.SkuId,
      SkuCode: row.SkuCode,
      WarehouseId: row.Dimension.WarehouseId,
      WarehouseCode: row.WarehouseCode,
      LocationId: row.Dimension.LocationId,
      LocationCode: row.LocationCode,
      SerialNumber: row.Dimension.SerialNumber,
      LotNumber: row.Dimension.LotNumber,
      ExpiryDate: row.Dimension.ExpiryDate,
      QtyOnHand: row.Balance.QtyOnHand,
      QtyAvailable: row.Balance.QtyAvailable,
      InventoryStatusCode: row.InventoryStatusCode,
    };
  }
}
