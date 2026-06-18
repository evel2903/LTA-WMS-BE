import { WarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileRuleDto';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';

export class WarehouseProfileRuleDtoMapper {
  public static ToDto(entity: WarehouseProfileRuleEntity): WarehouseProfileRuleDto {
    return {
      Id: entity.Id,
      WarehouseProfileId: entity.WarehouseProfileId,
      RuleDefinitionId: entity.RuleDefinitionId,
      IsEnabled: entity.IsEnabled,
      OverridePriority: entity.OverridePriority,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
