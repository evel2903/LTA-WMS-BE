import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ValidationRuleCatalogEntity } from '@modules/AccessControl/Domain/Entities/ValidationRuleCatalogEntity';
import { ValidationRuleCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ValidationRuleCatalogOrmEntity';

export class ValidationRuleCatalogOrmMapper {
  public static ToDomain(entity: ValidationRuleCatalogOrmEntity): ValidationRuleCatalogEntity {
    return new ValidationRuleCatalogEntity({
      Id: entity.Id,
      Code: entity.Code,
      Description: entity.Description,
      Trigger: entity.Trigger,
      ExpectedResult: entity.ExpectedResult,
      OwnerModule: entity.OwnerModule,
      ControlExceptionCode: entity.ControlExceptionCode,
      ImplementationStatus: entity.ImplementationStatus as CatalogImplementationStatus,
      SourceDocRef: entity.SourceDocRef,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ValidationRuleCatalogEntity): ValidationRuleCatalogOrmEntity {
    const orm = new ValidationRuleCatalogOrmEntity();
    orm.Id = entity.Id;
    orm.Code = entity.Code;
    orm.Description = entity.Description;
    orm.Trigger = entity.Trigger;
    orm.ExpectedResult = entity.ExpectedResult;
    orm.OwnerModule = entity.OwnerModule;
    orm.ControlExceptionCode = entity.ControlExceptionCode;
    orm.ImplementationStatus = entity.ImplementationStatus;
    orm.SourceDocRef = entity.SourceDocRef;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
