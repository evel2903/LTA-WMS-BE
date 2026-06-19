import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';

export class ReasonCodeOrmMapper {
  public static ToDomain(entity: ReasonCodeOrmEntity): ReasonCodeEntity {
    return new ReasonCodeEntity({
      Id: entity.Id,
      ReasonCode: entity.ReasonCode,
      ReasonGroup: entity.ReasonGroup as ReasonGroup,
      Description: entity.Description,
      AppliesToActions: (entity.AppliesToActions ?? []) as ActionCode[],
      AppliesToObjects: (entity.AppliesToObjects ?? []) as ObjectType[],
      EvidenceRequired: entity.EvidenceRequired,
      ApprovalRequired: entity.ApprovalRequired,
      AllowedRoleCodes: (entity.AllowedRoleCodes ?? null) as RoleCode[] | null,
      Status: entity.Status as ReasonCodeStatus,
      Version: entity.Version,
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ReasonCodeEntity): ReasonCodeOrmEntity {
    const orm = new ReasonCodeOrmEntity();
    orm.Id = entity.Id;
    orm.ReasonCode = entity.ReasonCode;
    orm.ReasonGroup = entity.ReasonGroup;
    orm.Description = entity.Description;
    orm.AppliesToActions = entity.AppliesToActions;
    orm.AppliesToObjects = entity.AppliesToObjects;
    orm.EvidenceRequired = entity.EvidenceRequired;
    orm.ApprovalRequired = entity.ApprovalRequired;
    orm.AllowedRoleCodes = entity.AllowedRoleCodes;
    orm.Status = entity.Status;
    orm.Version = entity.Version;
    orm.EffectiveFrom = entity.EffectiveFrom;
    orm.EffectiveTo = entity.EffectiveTo;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
