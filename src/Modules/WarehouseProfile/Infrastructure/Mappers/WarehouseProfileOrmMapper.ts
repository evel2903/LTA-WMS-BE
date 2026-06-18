import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';

export class WarehouseProfileOrmMapper {
  public static ToDomain(entity: WarehouseProfileOrmEntity): WarehouseProfileEntity {
    return new WarehouseProfileEntity({
      Id: entity.Id,
      ProfileCode: entity.ProfileCode,
      ProfileName: entity.ProfileName,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      Version: entity.Version,
      Status: entity.Status as WarehouseProfileStatus,
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
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      CapabilityFlags: entity.CapabilityFlags ?? {},
      StrategyPolicy: entity.StrategyPolicy ?? {},
      ThresholdPolicy: entity.ThresholdPolicy ?? {},
      ApprovalPolicy: entity.ApprovalPolicy ?? {},
      LabelDevicePolicy: entity.LabelDevicePolicy ?? {},
      IntegrationPolicy: entity.IntegrationPolicy ?? {},
      AuditPolicy: entity.AuditPolicy ?? {},
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: WarehouseProfileEntity): WarehouseProfileOrmEntity {
    const orm = new WarehouseProfileOrmEntity();
    orm.Id = entity.Id;
    orm.ProfileCode = entity.ProfileCode;
    orm.ProfileName = entity.ProfileName;
    orm.WarehouseTypeCode = entity.WarehouseTypeCode;
    orm.Version = entity.Version;
    orm.Status = entity.Status;
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
    orm.EffectiveFrom = entity.EffectiveFrom;
    orm.EffectiveTo = entity.EffectiveTo;
    orm.CapabilityFlags = entity.CapabilityFlags;
    orm.StrategyPolicy = entity.StrategyPolicy;
    orm.ThresholdPolicy = entity.ThresholdPolicy;
    orm.ApprovalPolicy = entity.ApprovalPolicy;
    orm.LabelDevicePolicy = entity.LabelDevicePolicy;
    orm.IntegrationPolicy = entity.IntegrationPolicy;
    orm.AuditPolicy = entity.AuditPolicy;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
