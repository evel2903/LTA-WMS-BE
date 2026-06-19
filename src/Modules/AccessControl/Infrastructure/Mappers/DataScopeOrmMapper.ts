import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';

export class DataScopeOrmMapper {
  public static ToDomain(entity: DataScopeOrmEntity): DataScopeEntity {
    return new DataScopeEntity({
      Id: entity.Id,
      PrincipalType: entity.PrincipalType as PrincipalType,
      PrincipalId: entity.PrincipalId,
      ScopeType: entity.ScopeType as DataScopeType,
      ScopeValueId: entity.ScopeValueId,
      ScopeValueCode: entity.ScopeValueCode,
      IncludeAll: entity.IncludeAll,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: DataScopeEntity): DataScopeOrmEntity {
    const orm = new DataScopeOrmEntity();
    orm.Id = entity.Id;
    orm.PrincipalType = entity.PrincipalType;
    orm.PrincipalId = entity.PrincipalId;
    orm.ScopeType = entity.ScopeType;
    orm.ScopeValueId = entity.ScopeValueId;
    orm.ScopeValueCode = entity.ScopeValueCode;
    orm.IncludeAll = entity.IncludeAll;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
