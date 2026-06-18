import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';

export class RuleGroupOrmMapper {
  public static ToDomain(entity: RuleGroupOrmEntity): RuleGroupEntity {
    return new RuleGroupEntity({
      Id: entity.Id,
      GroupCode: entity.GroupCode,
      GroupName: entity.GroupName,
      Description: entity.Description,
      CatalogState: entity.CatalogState as RuleGroupCatalogState,
      DisplayOrder: entity.DisplayOrder,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: RuleGroupEntity): RuleGroupOrmEntity {
    const orm = new RuleGroupOrmEntity();
    orm.Id = entity.Id;
    orm.GroupCode = entity.GroupCode;
    orm.GroupName = entity.GroupName;
    orm.Description = entity.Description;
    orm.CatalogState = entity.CatalogState;
    orm.DisplayOrder = entity.DisplayOrder;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
