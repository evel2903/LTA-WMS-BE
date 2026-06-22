import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';

export class MobileTaskOrmMapper {
  public static ToDomain(orm: MobileTaskOrmEntity): MobileTaskEntity {
    return new MobileTaskEntity({
      Id: orm.Id,
      TaskCode: orm.TaskCode,
      TaskType: orm.TaskType,
      TaskStatus: orm.TaskStatus,
      WarehouseId: orm.WarehouseId,
      WarehouseCode: orm.WarehouseCode,
      OwnerId: orm.OwnerId,
      OwnerCode: orm.OwnerCode,
      SourceDocumentType: orm.SourceDocumentType,
      SourceDocumentId: orm.SourceDocumentId,
      SourceDocumentCode: orm.SourceDocumentCode,
      Priority: orm.Priority,
      AssignedUserId: orm.AssignedUserId,
      ClaimedAt: orm.ClaimedAt,
      ReleasedAt: orm.ReleasedAt,
      DueAt: orm.DueAt,
      DeviceCode: orm.DeviceCode,
      SessionId: orm.SessionId,
      TaskPayload: orm.TaskPayload,
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
      UpdatedAt: orm.UpdatedAt,
      UpdatedBy: orm.UpdatedBy,
    });
  }

  public static ToOrm(entity: MobileTaskEntity): MobileTaskOrmEntity {
    const orm = new MobileTaskOrmEntity();
    orm.Id = entity.Id;
    orm.TaskCode = entity.TaskCode;
    orm.TaskType = entity.TaskType;
    orm.TaskStatus = entity.TaskStatus;
    orm.WarehouseId = entity.WarehouseId;
    orm.WarehouseCode = entity.WarehouseCode;
    orm.OwnerId = entity.OwnerId;
    orm.OwnerCode = entity.OwnerCode;
    orm.SourceDocumentType = entity.SourceDocumentType;
    orm.SourceDocumentId = entity.SourceDocumentId;
    orm.SourceDocumentCode = entity.SourceDocumentCode;
    orm.Priority = entity.Priority;
    orm.AssignedUserId = entity.AssignedUserId;
    orm.ClaimedAt = entity.ClaimedAt;
    orm.ReleasedAt = entity.ReleasedAt;
    orm.DueAt = entity.DueAt;
    orm.DeviceCode = entity.DeviceCode;
    orm.SessionId = entity.SessionId;
    orm.TaskPayload = entity.TaskPayload;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
