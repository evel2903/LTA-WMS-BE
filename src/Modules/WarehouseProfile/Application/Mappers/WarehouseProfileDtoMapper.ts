import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';

export class WarehouseProfileDtoMapper {
  public static ToDto(entity: WarehouseProfileEntity): WarehouseProfileDto {
    return {
      Id: entity.Id,
      ProfileCode: entity.ProfileCode,
      ProfileName: entity.ProfileName,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      Version: entity.Version,
      Status: entity.Status,
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
      EffectiveFrom: WarehouseProfileDtoMapper.ToDateString(entity.EffectiveFrom),
      EffectiveTo: entity.EffectiveTo ? WarehouseProfileDtoMapper.ToDateString(entity.EffectiveTo) : null,
      CapabilityFlags: entity.CapabilityFlags,
      StrategyPolicy: entity.StrategyPolicy,
      ThresholdPolicy: entity.ThresholdPolicy,
      ApprovalPolicy: entity.ApprovalPolicy,
      LabelDevicePolicy: entity.LabelDevicePolicy,
      IntegrationPolicy: entity.IntegrationPolicy,
      AuditPolicy: entity.AuditPolicy,
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
