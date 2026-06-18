import { InventoryBalanceDto } from '@modules/MasterData/Application/DTOs/InventoryBalanceDto';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';

export class InventoryBalanceMapper {
  public static ToDto(entity: InventoryBalanceEntity): InventoryBalanceDto {
    return {
      Id: entity.Id,
      DimensionId: entity.DimensionId,
      QtyOnHand: entity.QtyOnHand,
      QtyReserved: entity.QtyReserved,
      QtyAvailable: entity.QtyAvailable,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
