import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';

export class ReasonCodeDtoMapper {
  public static ToDto(entity: ReasonCodeEntity): ReasonCodeDto {
    return {
      Id: entity.Id,
      ReasonCode: entity.ReasonCode,
      ReasonGroup: entity.ReasonGroup,
      Description: entity.Description,
      AppliesToActions: entity.AppliesToActions,
      AppliesToObjects: entity.AppliesToObjects,
      EvidenceRequired: entity.EvidenceRequired,
      ApprovalRequired: entity.ApprovalRequired,
      AllowedRoleCodes: entity.AllowedRoleCodes,
      Status: entity.Status,
      Version: entity.Version,
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
    };
  }
}
