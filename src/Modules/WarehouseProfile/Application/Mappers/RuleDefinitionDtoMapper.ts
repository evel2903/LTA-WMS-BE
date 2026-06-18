import { RuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/RuleDefinitionDto';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';

export class RuleDefinitionDtoMapper {
  public static ToDto(entity: RuleDefinitionEntity): RuleDefinitionDto {
    return {
      Id: entity.Id,
      RuleCode: entity.RuleCode,
      RuleName: entity.RuleName,
      RuleGroupId: entity.RuleGroupId,
      PrecedenceTier: entity.PrecedenceTier,
      ControlMode: entity.ControlMode,
      Status: entity.Status,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      WarehouseId: entity.WarehouseId,
      ZoneId: entity.ZoneId,
      LocationType: entity.LocationType,
      OwnerId: entity.OwnerId,
      SkuId: entity.SkuId,
      ItemClass: entity.ItemClass,
      OrderType: entity.OrderType,
      CustomerId: entity.CustomerId,
      SupplierId: entity.SupplierId,
      ScopeKey: entity.ScopeKey,
      ConditionJson: entity.ConditionJson,
      ActionJson: entity.ActionJson,
      Priority: entity.Priority,
      EffectiveFrom: RuleDefinitionDtoMapper.ToDateString(entity.EffectiveFrom),
      EffectiveTo: entity.EffectiveTo ? RuleDefinitionDtoMapper.ToDateString(entity.EffectiveTo) : null,
      RequiresReason: entity.RequiresReason,
      RequiresEvidence: entity.RequiresEvidence,
      AllowOverride: entity.AllowOverride,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }

  private static ToDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
