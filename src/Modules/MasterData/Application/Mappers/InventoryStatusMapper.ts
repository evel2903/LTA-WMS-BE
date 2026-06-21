import { InventoryStatusDto } from '@modules/MasterData/Application/DTOs/InventoryStatusDto';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';

export class InventoryStatusMapper {
  public static ToDto(entity: InventoryStatusEntity): InventoryStatusDto {
    return {
      Id: entity.Id,
      StatusCode: entity.StatusCode,
      DisplayName: entity.DisplayName,
      StageGroup: entity.StageGroup,
      AllowsAllocation: entity.AllowsAllocation,
      AllowsPick: entity.AllowsPick,
      Hold: entity.Hold,
      IsTerminal: entity.IsTerminal,
      IsMilestone: entity.IsMilestone,
      SortOrder: entity.SortOrder,
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
