import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { ApprovalRequestDto } from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';

export class ApprovalRequestDtoMapper {
  public static ToDto(entity: ApprovalRequestEntity): ApprovalRequestDto {
    return {
      Id: entity.Id,
      RequesterUserId: entity.RequesterUserId,
      Action: entity.Action,
      TargetObjectType: entity.TargetObjectType,
      TargetObjectId: entity.TargetObjectId,
      TargetObjectCode: entity.TargetObjectCode,
      Scope: entity.Scope,
      RequestReasonCodeId: entity.RequestReasonCodeId,
      RequestReasonNote: entity.RequestReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      Decision: entity.Decision,
      DecidedByUserId: entity.DecidedByUserId,
      DecisionReasonCodeId: entity.DecisionReasonCodeId,
      DecisionNote: entity.DecisionNote,
      DecidedAt: entity.DecidedAt,
      ReferenceType: entity.ReferenceType,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    };
  }
}
