import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';

export const PutawayTaskToAuditJson = (task: PutawayTaskEntity): Record<string, unknown> => ({
  Id: task.Id,
  TaskCode: task.TaskCode,
  TaskStatus: task.TaskStatus,
  InboundPutawayReleaseId: task.InboundPutawayReleaseId,
  InventoryStatusCode: task.InventoryStatusCode,
  WarehouseId: task.WarehouseId,
  OwnerId: task.OwnerId,
  SourceLocationId: task.SourceLocationId,
  SourceLocationCode: task.SourceLocationCode,
  TargetLocationId: task.TargetLocationId,
  TargetLocationCode: task.TargetLocationCode,
  Quantity: task.Quantity,
  OutboxMessageId: task.OutboxMessageId,
  MobileTaskId: task.MobileTaskId,
});

export const BuildPutawayTaskAudit = (
  context: AuditContext,
  task: PutawayTaskEntity,
  input: {
    Action?: ActionCode;
    Result?: AuditResult;
    BeforeJson?: Record<string, unknown> | null;
    AfterJson?: Record<string, unknown> | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
  },
): AuditEntry =>
  MergeAuditContext(context, {
    Action: input.Action ?? ActionCode.Create,
    ObjectType: ObjectType.PutawayTask,
    ObjectId: task.Id,
    ObjectCode: task.TaskCode,
    BeforeJson: input.BeforeJson ?? null,
    AfterJson: input.AfterJson ?? null,
    ReasonCodeId: input.ReasonCodeId ?? null,
    ReasonNote: input.ReasonNote ?? null,
    EvidenceRefs: task.EvidenceRefs.length ? task.EvidenceRefs : null,
    ReferenceType: 'PutawayTask',
    ReferenceId: task.Id,
    WarehouseId: task.WarehouseId,
    OwnerId: task.OwnerId,
    ScopeJson: { WarehouseId: task.WarehouseId, OwnerId: task.OwnerId },
    Result: input.Result ?? AuditResult.Success,
  });
