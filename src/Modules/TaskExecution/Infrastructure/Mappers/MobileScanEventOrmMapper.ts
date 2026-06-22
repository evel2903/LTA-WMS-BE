import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';

export class MobileScanEventOrmMapper {
  public static ToDomain(orm: MobileScanEventOrmEntity): MobileScanEventEntity {
    return new MobileScanEventEntity({
      Id: orm.Id,
      TaskId: orm.TaskId,
      TaskCode: orm.TaskCode,
      WarehouseId: orm.WarehouseId,
      OwnerId: orm.OwnerId,
      ScanType: orm.ScanType,
      RawValue: orm.RawValue,
      NormalizedValue: orm.NormalizedValue,
      Result: orm.Result,
      ResolvedObjectType: orm.ResolvedObjectType,
      ResolvedObjectId: orm.ResolvedObjectId,
      ParsedValueJson: orm.ParsedValueJson,
      RejectionCode: orm.RejectionCode,
      RejectionMessage: orm.RejectionMessage,
      ReasonCode: orm.ReasonCode,
      DeviceCode: orm.DeviceCode,
      SessionId: orm.SessionId,
      ActorUserId: orm.ActorUserId,
      CreatedAt: orm.CreatedAt,
    });
  }

  public static ToOrm(entity: MobileScanEventEntity): MobileScanEventOrmEntity {
    const orm = new MobileScanEventOrmEntity();
    orm.Id = entity.Id;
    orm.TaskId = entity.TaskId;
    orm.TaskCode = entity.TaskCode;
    orm.WarehouseId = entity.WarehouseId;
    orm.OwnerId = entity.OwnerId;
    orm.ScanType = entity.ScanType;
    orm.RawValue = entity.RawValue;
    orm.NormalizedValue = entity.NormalizedValue;
    orm.Result = entity.Result;
    orm.ResolvedObjectType = entity.ResolvedObjectType;
    orm.ResolvedObjectId = entity.ResolvedObjectId;
    orm.ParsedValueJson = entity.ParsedValueJson;
    orm.RejectionCode = entity.RejectionCode;
    orm.RejectionMessage = entity.RejectionMessage;
    orm.ReasonCode = entity.ReasonCode;
    orm.DeviceCode = entity.DeviceCode;
    orm.SessionId = entity.SessionId;
    orm.ActorUserId = entity.ActorUserId;
    orm.CreatedAt = entity.CreatedAt;
    return orm;
  }
}
