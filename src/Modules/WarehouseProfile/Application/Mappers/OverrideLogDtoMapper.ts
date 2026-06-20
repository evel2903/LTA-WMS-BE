import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { OverrideLogDto } from '@modules/WarehouseProfile/Application/DTOs/OverrideLogDto';

export class OverrideLogDtoMapper {
  public static ToDto(entity: OverrideLogEntity): OverrideLogDto {
    return {
      Id: entity.Id,
      RuleId: entity.RuleId,
      RuleCode: entity.RuleCode,
      ActorUserId: entity.ActorUserId,
      TargetObjectType: entity.TargetObjectType,
      TargetObjectId: entity.TargetObjectId,
      TargetObjectCode: entity.TargetObjectCode,
      Scope: entity.Scope,
      ControlMode: entity.ControlMode,
      Action: entity.Action,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      ApprovalRequestId: entity.ApprovalRequestId,
      BeforeJson: entity.BeforeJson,
      AfterJson: entity.AfterJson,
      AuditRef: entity.AuditRef,
      CorrelationId: entity.CorrelationId,
      CreatedAt: entity.CreatedAt,
    };
  }
}
