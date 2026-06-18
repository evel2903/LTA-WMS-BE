import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';

export class ItemCoverageOrmMapper {
  public static ToDomain(entity: ItemCoverageOrmEntity): ItemCoverageEntity {
    return new ItemCoverageEntity({
      Id: entity.Id,
      SkuId: entity.SkuId,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      MinQty: entity.MinQty === null ? null : Number(entity.MinQty),
      MaxQty: entity.MaxQty === null ? null : Number(entity.MaxQty),
      StandardQty: entity.StandardQty === null ? null : Number(entity.StandardQty),
      MultipleQty: entity.MultipleQty === null ? null : Number(entity.MultipleQty),
      LeadTimeDays: entity.LeadTimeDays,
      DefaultReceiveWarehouseId: entity.DefaultReceiveWarehouseId,
      DefaultShipWarehouseId: entity.DefaultShipWarehouseId,
      ReorderPolicy: entity.ReorderPolicy,
      StopReceiving: entity.StopReceiving,
      StopShipping: entity.StopShipping,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ItemCoverageEntity): ItemCoverageOrmEntity {
    const orm = new ItemCoverageOrmEntity();
    orm.Id = entity.Id;
    orm.SkuId = entity.SkuId;
    orm.WarehouseId = entity.WarehouseId;
    orm.OwnerId = entity.OwnerId;
    orm.MinQty = entity.MinQty;
    orm.MaxQty = entity.MaxQty;
    orm.StandardQty = entity.StandardQty;
    orm.MultipleQty = entity.MultipleQty;
    orm.LeadTimeDays = entity.LeadTimeDays;
    orm.DefaultReceiveWarehouseId = entity.DefaultReceiveWarehouseId;
    orm.DefaultShipWarehouseId = entity.DefaultShipWarehouseId;
    orm.ReorderPolicy = entity.ReorderPolicy;
    orm.StopReceiving = entity.StopReceiving;
    orm.StopShipping = entity.StopShipping;
    orm.Status = entity.Status;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
