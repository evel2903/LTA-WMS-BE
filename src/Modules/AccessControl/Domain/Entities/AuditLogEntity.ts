import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';

/**
 * An append-only audit record (architecture 6.5). Written inside the command's
 * transaction via IAuditWriter; never updated or deleted (DB trigger enforces it).
 */
export class AuditLogEntity {
  public readonly Id: string;
  public readonly OccurredAt: Date;
  public readonly ActorUserId: string | null;
  public readonly ActorRoleCodes: string[] | null;
  public readonly ActorSnapshotStatus: ActorSnapshotStatus;
  public readonly ActorType: ActorType;
  public readonly Action: ActionCode;
  public readonly ObjectType: ObjectType;
  public readonly ObjectId: string | null;
  public readonly ObjectCode: string | null;
  public readonly BeforeJson: Record<string, unknown> | null;
  public readonly AfterJson: Record<string, unknown> | null;
  public readonly ReasonCodeId: string | null;
  public readonly ReasonNote: string | null;
  public readonly EvidenceRefs: unknown[] | null;
  public readonly ReferenceType: string | null;
  public readonly ReferenceId: string | null;
  public readonly WarehouseId: string | null;
  public readonly OwnerId: string | null;
  public readonly ScopeJson: Record<string, unknown> | null;
  public readonly CorrelationId: string | null;
  public readonly RequestId: string | null;
  public readonly IpAddress: string | null;
  public readonly UserAgent: string | null;
  public readonly Result: AuditResult;

  constructor(params: {
    Id: string;
    OccurredAt: Date;
    ActorUserId?: string | null;
    ActorRoleCodes?: string[] | null;
    ActorSnapshotStatus?: ActorSnapshotStatus;
    ActorType: ActorType;
    Action: ActionCode;
    ObjectType: ObjectType;
    ObjectId?: string | null;
    ObjectCode?: string | null;
    BeforeJson?: Record<string, unknown> | null;
    AfterJson?: Record<string, unknown> | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: unknown[] | null;
    ReferenceType?: string | null;
    ReferenceId?: string | null;
    WarehouseId?: string | null;
    OwnerId?: string | null;
    ScopeJson?: Record<string, unknown> | null;
    CorrelationId?: string | null;
    RequestId?: string | null;
    IpAddress?: string | null;
    UserAgent?: string | null;
    Result?: AuditResult;
  }) {
    this.Id = params.Id;
    this.OccurredAt = params.OccurredAt;
    this.ActorUserId = params.ActorUserId ?? null;
    if (params.ActorSnapshotStatus !== undefined && params.ActorRoleCodes === undefined) {
      throw new Error('Audit actor snapshot provenance requires explicit role codes');
    }
    this.ActorRoleCodes = params.ActorRoleCodes === undefined ? [] : params.ActorRoleCodes;
    this.ActorSnapshotStatus = params.ActorSnapshotStatus ?? ActorSnapshotStatus.LegacyUnverified;
    const unresolved = this.ActorSnapshotStatus === ActorSnapshotStatus.Unresolved;
    if (unresolved !== (this.ActorRoleCodes === null)) {
      throw new Error('Audit actor snapshot provenance is inconsistent');
    }
    this.ActorType = params.ActorType;
    this.Action = params.Action;
    this.ObjectType = params.ObjectType;
    this.ObjectId = params.ObjectId ?? null;
    this.ObjectCode = params.ObjectCode ?? null;
    this.BeforeJson = params.BeforeJson ?? null;
    this.AfterJson = params.AfterJson ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? null;
    this.ReferenceType = params.ReferenceType ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.WarehouseId = params.WarehouseId ?? null;
    this.OwnerId = params.OwnerId ?? null;
    this.ScopeJson = params.ScopeJson ?? null;
    this.CorrelationId = params.CorrelationId ?? null;
    this.RequestId = params.RequestId ?? null;
    this.IpAddress = params.IpAddress ?? null;
    this.UserAgent = params.UserAgent ?? null;
    this.Result = params.Result ?? AuditResult.Success;
  }
}
