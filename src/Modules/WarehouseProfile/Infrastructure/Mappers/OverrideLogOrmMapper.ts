import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { OverrideLogOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/OverrideLogOrmEntity';

export class OverrideLogOrmMapper {
  public static ToDomain(entity: OverrideLogOrmEntity): OverrideLogEntity {
    return new OverrideLogEntity({
      Id: entity.Id,
      RuleId: entity.RuleId,
      RuleCode: entity.RuleCode,
      ActorUserId: entity.ActorUserId,
      TargetObjectType: entity.TargetObjectType as ObjectType,
      TargetObjectId: entity.TargetObjectId,
      TargetObjectCode: entity.TargetObjectCode,
      Scope: (entity.Scope ?? null) as Record<string, unknown> | null,
      ControlMode: entity.ControlMode as RuleControlMode,
      Action: entity.Action as ActionCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: (entity.EvidenceRefs ?? null) as unknown[] | null,
      ApprovalRequestId: entity.ApprovalRequestId,
      BeforeJson: (entity.BeforeJson ?? null) as Record<string, unknown> | null,
      AfterJson: (entity.AfterJson ?? null) as Record<string, unknown> | null,
      AuditRef: entity.AuditRef,
      CorrelationId: entity.CorrelationId,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
    });
  }

  public static ToOrm(entity: OverrideLogEntity): OverrideLogOrmEntity {
    const orm = new OverrideLogOrmEntity();
    orm.Id = entity.Id;
    orm.RuleId = entity.RuleId;
    orm.RuleCode = entity.RuleCode;
    orm.ActorUserId = entity.ActorUserId;
    orm.TargetObjectType = entity.TargetObjectType;
    orm.TargetObjectId = entity.TargetObjectId;
    orm.TargetObjectCode = entity.TargetObjectCode;
    orm.Scope = entity.Scope;
    orm.ControlMode = entity.ControlMode;
    orm.Action = entity.Action;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.ApprovalRequestId = entity.ApprovalRequestId;
    orm.BeforeJson = entity.BeforeJson;
    orm.AfterJson = entity.AfterJson;
    orm.AuditRef = entity.AuditRef;
    orm.CorrelationId = entity.CorrelationId;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }
}
