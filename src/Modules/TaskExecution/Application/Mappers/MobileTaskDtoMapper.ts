import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export class MobileTaskDtoMapper {
  public static ToDto(task: MobileTaskEntity): MobileTaskDto {
    return {
      Id: task.Id,
      TaskCode: task.TaskCode,
      TaskType: task.TaskType,
      TaskStatus: task.TaskStatus,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      SourceDocumentType: task.SourceDocumentType,
      SourceDocumentId: task.SourceDocumentId,
      SourceDocumentCode: task.SourceDocumentCode,
      Priority: task.Priority,
      AssignedUserId: task.AssignedUserId,
      ClaimedAt: iso(task.ClaimedAt),
      ReleasedAt: iso(task.ReleasedAt),
      DueAt: iso(task.DueAt),
      DeviceCode: task.DeviceCode,
      SessionId: task.SessionId,
      TaskPayload: task.TaskPayload,
      CreatedAt: task.CreatedAt.toISOString(),
      UpdatedAt: task.UpdatedAt.toISOString(),
    };
  }
}
