import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';

export class InventoryBalanceOrmMapper {
  public static ToDomain(entity: InventoryBalanceOrmEntity): InventoryBalanceEntity {
    return new InventoryBalanceEntity({
      Id: entity.Id,
      DimensionId: entity.DimensionId,
      QtyOnHand: Number(entity.QtyOnHand),
      QtyReserved: Number(entity.QtyReserved),
      QtyAvailable: Number(entity.QtyAvailable),
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: InventoryBalanceEntity): InventoryBalanceOrmEntity {
    const orm = new InventoryBalanceOrmEntity();
    orm.Id = entity.Id;
    orm.DimensionId = entity.DimensionId;
    orm.QtyOnHand = entity.QtyOnHand;
    orm.QtyReserved = entity.QtyReserved;
    orm.QtyAvailable = entity.QtyAvailable;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
