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
      Hold: entity.Hold,
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

  public static ToOrm(entity: InventoryStatusEntity): InventoryStatusOrmEntity {
    const orm = new InventoryStatusOrmEntity();
    orm.Id = entity.Id;
    orm.StatusCode = entity.StatusCode;
    orm.DisplayName = entity.DisplayName;
    orm.StageGroup = entity.StageGroup;
    orm.AllowsAllocation = entity.AllowsAllocation;
    orm.AllowsPick = entity.AllowsPick;
    orm.Hold = entity.Hold;
    orm.IsTerminal = entity.IsTerminal;
    orm.IsMilestone = entity.IsMilestone;
    orm.SortOrder = entity.SortOrder;
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
