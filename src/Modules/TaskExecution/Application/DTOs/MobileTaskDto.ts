import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

export interface MobileTaskDto {
  Id: string;
  TaskCode: string;
  TaskType: MobileTaskType;
  TaskStatus: MobileTaskStatus;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  SourceDocumentType: string;
  SourceDocumentId: string;
  SourceDocumentCode: string | null;
  Priority: number;
  AssignedUserId: string | null;
  ClaimedAt: string | null;
  ReleasedAt: string | null;
  DueAt: string | null;
  DeviceCode: string | null;
  SessionId: string | null;
  TaskPayload: Record<string, unknown>;
  CreatedAt: string;
  UpdatedAt: string;
}
