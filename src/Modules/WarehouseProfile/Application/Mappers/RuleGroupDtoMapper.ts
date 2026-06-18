import { RuleGroupDto } from '@modules/WarehouseProfile/Application/DTOs/RuleGroupDto';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';

export class RuleGroupDtoMapper {
  public static ToDto(entity: RuleGroupEntity): RuleGroupDto {
    return {
      Id: entity.Id,
      GroupCode: entity.GroupCode,
      GroupName: entity.GroupName,
      Description: entity.Description,
      CatalogState: entity.CatalogState,
      DisplayOrder: entity.DisplayOrder,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
