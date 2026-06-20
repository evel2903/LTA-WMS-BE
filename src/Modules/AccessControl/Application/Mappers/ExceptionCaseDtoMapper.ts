import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';

export class ExceptionCaseDtoMapper {
  public static ToDto(entity: ExceptionCaseEntity): ExceptionCaseDto {
    return {
      Id: entity.Id,
      ExceptionType: entity.ExceptionType,
      State: entity.State,
      SubStatus: entity.SubStatus,
      Outcome: entity.Outcome,
      ReferenceType: entity.ReferenceType,
      ReferenceId: entity.ReferenceId,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      ReasonCodeId: entity.ReasonCodeId,
      AssignedToUserId: entity.AssignedToUserId,
      AssignedRoleId: entity.AssignedRoleId,
      DetectedRuleId: entity.DetectedRuleId,
      ApprovalRequestId: entity.ApprovalRequestId,
      Severity: entity.Severity,
      EvidenceRefs: entity.EvidenceRefs,
      ResolutionNote: entity.ResolutionNote,
      OpenedAt: entity.OpenedAt,
      ResolvedAt: entity.ResolvedAt,
      ClosedAt: entity.ClosedAt,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    };
  }
}
