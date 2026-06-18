import { ItemCoverageDto } from '@modules/MasterData/Application/DTOs/ItemCoverageDto';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';

export class ItemCoverageMapper {
  public static ToDto(entity: ItemCoverageEntity): ItemCoverageDto {
    return {
      Id: entity.Id,
      SkuId: entity.SkuId,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      MinQty: entity.MinQty,
      MaxQty: entity.MaxQty,
      StandardQty: entity.StandardQty,
      MultipleQty: entity.MultipleQty,
      LeadTimeDays: entity.LeadTimeDays,
      DefaultReceiveWarehouseId: entity.DefaultReceiveWarehouseId,
      DefaultShipWarehouseId: entity.DefaultShipWarehouseId,
      ReorderPolicy: entity.ReorderPolicy,
      StopReceiving: entity.StopReceiving,
      StopShipping: entity.StopShipping,
      Status: entity.Status,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
