import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';

export class ApprovalRequestOrmMapper {
  public static ToDomain(entity: ApprovalRequestOrmEntity): ApprovalRequestEntity {
    return new ApprovalRequestEntity({
      Id: entity.Id,
      RequesterUserId: entity.RequesterUserId,
      Action: entity.Action as ActionCode,
      TargetObjectType: entity.TargetObjectType as ObjectType,
      TargetObjectId: entity.TargetObjectId,
      TargetObjectCode: entity.TargetObjectCode,
      Scope: (entity.Scope ?? null) as Record<string, unknown> | null,
      RequestReasonCodeId: entity.RequestReasonCodeId,
      RequestReasonNote: entity.RequestReasonNote,
      EvidenceRefs: (entity.EvidenceRefs ?? null) as unknown[] | null,
      Decision: entity.Decision as ApprovalDecision,
      DecidedByUserId: entity.DecidedByUserId,
      DecisionReasonCodeId: entity.DecisionReasonCodeId,
      DecisionNote: entity.DecisionNote,
      DecidedAt: entity.DecidedAt,
      ReferenceType: entity.ReferenceType,
      ReferenceId: entity.ReferenceId,
      CorrelationId: entity.CorrelationId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ApprovalRequestEntity): ApprovalRequestOrmEntity {
    const orm = new ApprovalRequestOrmEntity();
    orm.Id = entity.Id;
    orm.RequesterUserId = entity.RequesterUserId;
    orm.Action = entity.Action;
    orm.TargetObjectType = entity.TargetObjectType;
    orm.TargetObjectId = entity.TargetObjectId;
    orm.TargetObjectCode = entity.TargetObjectCode;
    orm.Scope = entity.Scope;
    orm.RequestReasonCodeId = entity.RequestReasonCodeId;
    orm.RequestReasonNote = entity.RequestReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.Decision = entity.Decision;
    orm.DecidedByUserId = entity.DecidedByUserId;
    orm.DecisionReasonCodeId = entity.DecisionReasonCodeId;
    orm.DecisionNote = entity.DecisionNote;
    orm.DecidedAt = entity.DecidedAt;
    orm.ReferenceType = entity.ReferenceType;
    orm.ReferenceId = entity.ReferenceId;
    orm.CorrelationId = entity.CorrelationId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
