import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';

export class RuleDefinitionOrmMapper {
  public static ToDomain(entity: RuleDefinitionOrmEntity): RuleDefinitionEntity {
    return new RuleDefinitionEntity({
      Id: entity.Id,
      RuleCode: entity.RuleCode,
      RuleName: entity.RuleName,
      RuleGroupId: entity.RuleGroupId,
      PrecedenceTier: entity.PrecedenceTier as RulePrecedenceTier,
      ControlMode: entity.ControlMode as RuleControlMode,
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
      ConditionJson: entity.ConditionJson ?? {},
      ActionJson: entity.ActionJson ?? {},
      Priority: entity.Priority,
      Status: entity.Status as RuleStatus,
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      RequiresReason: entity.RequiresReason,
      RequiresEvidence: entity.RequiresEvidence,
      AllowOverride: entity.AllowOverride,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: RuleDefinitionEntity): RuleDefinitionOrmEntity {
    const orm = new RuleDefinitionOrmEntity();
    orm.Id = entity.Id;
    orm.RuleCode = entity.RuleCode;
    orm.RuleName = entity.RuleName;
    orm.RuleGroupId = entity.RuleGroupId;
    orm.PrecedenceTier = entity.PrecedenceTier;
    orm.ControlMode = entity.ControlMode;
    orm.WarehouseTypeCode = entity.WarehouseTypeCode;
    orm.WarehouseId = entity.WarehouseId;
    orm.ZoneId = entity.ZoneId;
    orm.LocationType = entity.LocationType;
    orm.OwnerId = entity.OwnerId;
    orm.SkuId = entity.SkuId;
    orm.ItemClass = entity.ItemClass;
    orm.OrderType = entity.OrderType;
    orm.CustomerId = entity.CustomerId;
    orm.SupplierId = entity.SupplierId;
    orm.ScopeKey = entity.ScopeKey;
    orm.ConditionJson = entity.ConditionJson;
    orm.ActionJson = entity.ActionJson;
    orm.Priority = entity.Priority;
    orm.Status = entity.Status;
    orm.EffectiveFrom = entity.EffectiveFrom;
    orm.EffectiveTo = entity.EffectiveTo;
    orm.RequiresReason = entity.RequiresReason;
    orm.RequiresEvidence = entity.RequiresEvidence;
    orm.AllowOverride = entity.AllowOverride;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
