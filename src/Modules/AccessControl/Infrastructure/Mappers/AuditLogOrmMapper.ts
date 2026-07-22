import { randomUUID } from 'crypto';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';

export class AuditLogOrmMapper {
  /** Build a new ORM row from an append entry. Id is generated; occurred_at is DB-defaulted. */
  public static FromEntry(entry: AuditEntry): AuditLogOrmEntity {
    const orm = new AuditLogOrmEntity();
    orm.Id = randomUUID();
    orm.ActorUserId = entry.ActorUserId ?? null;
    if (entry.ActorSnapshotStatus !== undefined && entry.ActorRoleCodes === undefined) {
      throw new Error('Audit actor snapshot provenance requires explicit role codes');
    }
    orm.ActorRoleCodes = entry.ActorRoleCodes === undefined ? [] : entry.ActorRoleCodes;
    orm.ActorSnapshotStatus = entry.ActorSnapshotStatus ?? ActorSnapshotStatus.LegacyUnverified;
    this.AssertProvenance(orm.ActorRoleCodes, orm.ActorSnapshotStatus);
    orm.ActorType = entry.ActorType;
    orm.Action = entry.Action;
    orm.ObjectType = entry.ObjectType;
    orm.ObjectId = entry.ObjectId ?? null;
    orm.ObjectCode = entry.ObjectCode ?? null;
    orm.BeforeJson = entry.BeforeJson ?? null;
    orm.AfterJson = entry.AfterJson ?? null;
    orm.ReasonCodeId = entry.ReasonCodeId ?? null;
    orm.ReasonNote = entry.ReasonNote ?? null;
    orm.EvidenceRefs = entry.EvidenceRefs ?? null;
    orm.ReferenceType = entry.ReferenceType ?? null;
    orm.ReferenceId = entry.ReferenceId ?? null;
    orm.WarehouseId = entry.WarehouseId ?? null;
    orm.OwnerId = entry.OwnerId ?? null;
    orm.ScopeJson = entry.ScopeJson ?? null;
    orm.CorrelationId = entry.CorrelationId ?? null;
    orm.RequestId = entry.RequestId ?? null;
    orm.IpAddress = entry.IpAddress ?? null;
    orm.UserAgent = entry.UserAgent ?? null;
    orm.Result = entry.Result ?? AuditResult.Success;
    return orm;
  }

  public static ToDomain(entity: AuditLogOrmEntity): AuditLogEntity {
    return new AuditLogEntity({
      Id: entity.Id,
      OccurredAt: entity.OccurredAt,
      ActorUserId: entity.ActorUserId,
      ActorRoleCodes: entity.ActorRoleCodes,
      ActorSnapshotStatus: entity.ActorSnapshotStatus,
      ActorType: entity.ActorType as ActorType,
      Action: entity.Action as ActionCode,
      ObjectType: entity.ObjectType as ObjectType,
      ObjectId: entity.ObjectId,
      ObjectCode: entity.ObjectCode,
      BeforeJson: entity.BeforeJson,
      AfterJson: entity.AfterJson,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      ReferenceType: entity.ReferenceType,
      ReferenceId: entity.ReferenceId,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      ScopeJson: entity.ScopeJson,
      CorrelationId: entity.CorrelationId,
      RequestId: entity.RequestId,
      IpAddress: entity.IpAddress,
      UserAgent: entity.UserAgent,
      Result: entity.Result as AuditResult,
    });
  }

  private static AssertProvenance(codes: string[] | null, status: ActorSnapshotStatus): void {
    const unresolved = status === ActorSnapshotStatus.Unresolved;
    if (unresolved !== (codes === null)) {
      throw new Error('Audit actor snapshot provenance is inconsistent');
    }
  }
}
