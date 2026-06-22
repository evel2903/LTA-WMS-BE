import { randomUUID } from 'node:crypto';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

export interface MobileTaskEntityProps {
  Id?: string;
  TaskCode: string;
  TaskType: MobileTaskType;
  TaskStatus: MobileTaskStatus;
  WarehouseId: string;
  WarehouseCode?: string | null;
  OwnerId?: string | null;
  OwnerCode?: string | null;
  SourceDocumentType: string;
  SourceDocumentId: string;
  SourceDocumentCode?: string | null;
  Priority: number;
  AssignedUserId?: string | null;
  ClaimedAt?: Date | null;
  ReleasedAt?: Date | null;
  DueAt?: Date | null;
  DeviceCode?: string | null;
  SessionId?: string | null;
  TaskPayload: Record<string, unknown>;
  CreatedAt?: Date;
  CreatedBy?: string | null;
  UpdatedAt?: Date;
  UpdatedBy?: string | null;
}

export class MobileTaskEntity {
  public Id: string;
  public TaskCode: string;
  public TaskType: MobileTaskType;
  public TaskStatus: MobileTaskStatus;
  public WarehouseId: string;
  public WarehouseCode: string | null;
  public OwnerId: string | null;
  public OwnerCode: string | null;
  public SourceDocumentType: string;
  public SourceDocumentId: string;
  public SourceDocumentCode: string | null;
  public Priority: number;
  public AssignedUserId: string | null;
  public ClaimedAt: Date | null;
  public ReleasedAt: Date | null;
  public DueAt: Date | null;
  public DeviceCode: string | null;
  public SessionId: string | null;
  public TaskPayload: Record<string, unknown>;
  public CreatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedAt: Date;
  public UpdatedBy: string | null;

  constructor(props: MobileTaskEntityProps) {
    const now = new Date();
    this.Id = props.Id ?? randomUUID();
    this.TaskCode = props.TaskCode;
    this.TaskType = props.TaskType;
    this.TaskStatus = props.TaskStatus;
    this.WarehouseId = props.WarehouseId;
    this.WarehouseCode = props.WarehouseCode ?? null;
    this.OwnerId = props.OwnerId ?? null;
    this.OwnerCode = props.OwnerCode ?? null;
    this.SourceDocumentType = props.SourceDocumentType;
    this.SourceDocumentId = props.SourceDocumentId;
    this.SourceDocumentCode = props.SourceDocumentCode ?? null;
    this.Priority = props.Priority;
    this.AssignedUserId = props.AssignedUserId ?? null;
    this.ClaimedAt = props.ClaimedAt ?? null;
    this.ReleasedAt = props.ReleasedAt ?? null;
    this.DueAt = props.DueAt ?? null;
    this.DeviceCode = props.DeviceCode ?? null;
    this.SessionId = props.SessionId ?? null;
    this.TaskPayload = props.TaskPayload;
    this.CreatedAt = props.CreatedAt ?? now;
    this.CreatedBy = props.CreatedBy ?? null;
    this.UpdatedAt = props.UpdatedAt ?? now;
    this.UpdatedBy = props.UpdatedBy ?? null;
  }

  public Claim(
    actorUserId: string,
    input: { DeviceCode?: string | null; SessionId?: string | null },
    now = new Date(),
  ) {
    this.TaskStatus = MobileTaskStatus.Claimed;
    this.AssignedUserId = actorUserId;
    this.ClaimedAt = now;
    this.ReleasedAt = null;
    this.DeviceCode = input.DeviceCode ?? this.DeviceCode;
    this.SessionId = input.SessionId ?? this.SessionId;
    this.UpdatedAt = now;
    this.UpdatedBy = actorUserId;
  }

  public Release(actorUserId: string, now = new Date()) {
    this.TaskStatus = MobileTaskStatus.Released;
    this.AssignedUserId = null;
    this.ReleasedAt = now;
    this.DeviceCode = null;
    this.SessionId = null;
    this.UpdatedAt = now;
    this.UpdatedBy = actorUserId;
  }
}
