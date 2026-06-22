import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';

export const TaskToAuditJson = (task: MobileTaskEntity): Record<string, unknown> => ({
  Id: task.Id,
  TaskCode: task.TaskCode,
  TaskType: task.TaskType,
  TaskStatus: task.TaskStatus,
  WarehouseId: task.WarehouseId,
  OwnerId: task.OwnerId,
  AssignedUserId: task.AssignedUserId,
  ClaimedAt: task.ClaimedAt?.toISOString() ?? null,
  ReleasedAt: task.ReleasedAt?.toISOString() ?? null,
});

export const BuildMobileTaskAudit = (
  context: AuditContext,
  task: MobileTaskEntity,
  input: {
    ObjectCode: string;
    BeforeJson?: Record<string, unknown> | null;
    AfterJson?: Record<string, unknown> | null;
    Result?: AuditResult;
    ReasonNote?: string | null;
  },
): AuditEntry =>
  MergeAuditContext(context, {
    Action: ActionCode.Update,
    ObjectType: ObjectType.MobileTask,
    ObjectId: task.Id,
    ObjectCode: input.ObjectCode,
    BeforeJson: input.BeforeJson ?? null,
    AfterJson: input.AfterJson ?? null,
    ReasonNote: input.ReasonNote ?? null,
    WarehouseId: task.WarehouseId,
    OwnerId: task.OwnerId,
    ScopeJson: { WarehouseId: task.WarehouseId, OwnerId: task.OwnerId },
    Result: input.Result ?? AuditResult.Success,
  });
