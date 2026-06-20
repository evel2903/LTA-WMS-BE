import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionSubStatus } from '@modules/AccessControl/Domain/Enums/ExceptionSubStatus';
import { ExceptionOutcome } from '@modules/AccessControl/Domain/Enums/ExceptionOutcome';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';

export class ExceptionCaseOrmMapper {
  public static ToDomain(entity: ExceptionCaseOrmEntity): ExceptionCaseEntity {
    return new ExceptionCaseEntity({
      Id: entity.Id,
      ExceptionType: entity.ExceptionType,
      State: entity.State as ExceptionState,
      SubStatus: (entity.SubStatus as ExceptionSubStatus | null) ?? null,
      Outcome: (entity.Outcome as ExceptionOutcome | null) ?? null,
      ReferenceType: entity.ReferenceType,
      ReferenceId: entity.ReferenceId,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      ReasonCodeId: entity.ReasonCodeId,
      AssignedToUserId: entity.AssignedToUserId,
      AssignedRoleId: entity.AssignedRoleId,
      DetectedRuleId: entity.DetectedRuleId,
      ApprovalRequestId: entity.ApprovalRequestId,
      Severity: entity.Severity as ControlExceptionSeverity,
      EvidenceRefs: (entity.EvidenceRefs ?? null) as unknown[] | null,
      ResolutionNote: entity.ResolutionNote,
      OpenedAt: entity.OpenedAt,
      ResolvedAt: entity.ResolvedAt,
      ClosedAt: entity.ClosedAt,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ExceptionCaseEntity): ExceptionCaseOrmEntity {
    const orm = new ExceptionCaseOrmEntity();
    orm.Id = entity.Id;
    orm.ExceptionType = entity.ExceptionType;
    orm.State = entity.State;
    orm.SubStatus = entity.SubStatus;
    orm.Outcome = entity.Outcome;
    orm.ReferenceType = entity.ReferenceType;
    orm.ReferenceId = entity.ReferenceId;
    orm.WarehouseId = entity.WarehouseId;
    orm.OwnerId = entity.OwnerId;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.AssignedToUserId = entity.AssignedToUserId;
    orm.AssignedRoleId = entity.AssignedRoleId;
    orm.DetectedRuleId = entity.DetectedRuleId;
    orm.ApprovalRequestId = entity.ApprovalRequestId;
    orm.Severity = entity.Severity;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.ResolutionNote = entity.ResolutionNote;
    orm.OpenedAt = entity.OpenedAt;
    orm.ResolvedAt = entity.ResolvedAt;
    orm.ClosedAt = entity.ClosedAt;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
