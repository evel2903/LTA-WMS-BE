import { MobileScanEventDto } from '@modules/TaskExecution/Application/DTOs/MobileScanEventDto';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';

export class MobileScanEventDtoMapper {
  public static ToDto(scan: MobileScanEventEntity): MobileScanEventDto {
    return {
      Id: scan.Id,
      TaskId: scan.TaskId,
      TaskCode: scan.TaskCode,
      WarehouseId: scan.WarehouseId,
      OwnerId: scan.OwnerId,
      ScanType: scan.ScanType,
      RawValue: scan.RawValue,
      NormalizedValue: scan.NormalizedValue,
      Result: scan.Result,
      ResolvedObjectType: scan.ResolvedObjectType,
      ResolvedObjectId: scan.ResolvedObjectId,
      ParsedValueJson: scan.ParsedValueJson,
      RejectionCode: scan.RejectionCode,
      RejectionMessage: scan.RejectionMessage,
      ReasonCode: scan.ReasonCode,
      DeviceCode: scan.DeviceCode,
      SessionId: scan.SessionId,
      ActorUserId: scan.ActorUserId,
      CreatedAt: scan.CreatedAt.toISOString(),
    };
  }
}
