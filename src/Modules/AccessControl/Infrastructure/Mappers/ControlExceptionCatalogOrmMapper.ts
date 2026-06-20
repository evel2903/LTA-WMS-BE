import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';

export class ControlExceptionCatalogOrmMapper {
  public static ToDomain(entity: ControlExceptionCatalogOrmEntity): ControlExceptionCatalogEntity {
    return new ControlExceptionCatalogEntity({
      Id: entity.Id,
      Code: entity.Code,
      Scenario: entity.Scenario,
      Category: entity.Category as ControlExceptionCategory,
      Severity: entity.Severity as ControlExceptionSeverity,
      DefaultState: entity.DefaultState as ControlExceptionDefaultState,
      ActionAllowed: entity.ActionAllowed as ControlExceptionAction,
      ReasonRequired: entity.ReasonRequired,
      EvidenceRequired: entity.EvidenceRequired,
      ApprovalRequired: entity.ApprovalRequired,
      OwnerRoles: (entity.OwnerRoles ?? []) as string[],
      ImplementationStatus: entity.ImplementationStatus as CatalogImplementationStatus,
      SourceDocRef: entity.SourceDocRef,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ControlExceptionCatalogEntity): ControlExceptionCatalogOrmEntity {
    const orm = new ControlExceptionCatalogOrmEntity();
    orm.Id = entity.Id;
    orm.Code = entity.Code;
    orm.Scenario = entity.Scenario;
    orm.Category = entity.Category;
    orm.Severity = entity.Severity;
    orm.DefaultState = entity.DefaultState;
    orm.ActionAllowed = entity.ActionAllowed;
    orm.ReasonRequired = entity.ReasonRequired;
    orm.EvidenceRequired = entity.EvidenceRequired;
    orm.ApprovalRequired = entity.ApprovalRequired;
    orm.OwnerRoles = entity.OwnerRoles;
    orm.ImplementationStatus = entity.ImplementationStatus;
    orm.SourceDocRef = entity.SourceDocRef;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
