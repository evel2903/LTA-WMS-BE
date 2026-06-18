import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';

export class InventoryStatusOrmMapper {
  public static ToDomain(entity: InventoryStatusOrmEntity): InventoryStatusEntity {
    return new InventoryStatusEntity({
      Id: entity.Id,
      StatusCode: entity.StatusCode,
      DisplayName: entity.DisplayName,
      StageGroup: entity.StageGroup,
      AllowsAllocation: entity.AllowsAllocation,
      AllowsPick: entity.AllowsPick,
      IsTerminal: entity.IsTerminal,
      IsMilestone: entity.IsMilestone,
      SortOrder: entity.SortOrder,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }
}
