import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';

export class WarehouseProfileRuleOrmMapper {
  public static ToDomain(entity: WarehouseProfileRuleOrmEntity): WarehouseProfileRuleEntity {
    return new WarehouseProfileRuleEntity({
      Id: entity.Id,
      WarehouseProfileId: entity.WarehouseProfileId,
      RuleDefinitionId: entity.RuleDefinitionId,
      IsEnabled: entity.IsEnabled,
      OverridePriority: entity.OverridePriority,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: WarehouseProfileRuleEntity): WarehouseProfileRuleOrmEntity {
    const orm = new WarehouseProfileRuleOrmEntity();
    orm.Id = entity.Id;
    orm.WarehouseProfileId = entity.WarehouseProfileId;
    orm.RuleDefinitionId = entity.RuleDefinitionId;
    orm.IsEnabled = entity.IsEnabled;
    orm.OverridePriority = entity.OverridePriority;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
