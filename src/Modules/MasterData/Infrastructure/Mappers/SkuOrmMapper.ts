import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';

export class SkuOrmMapper {
  public static ToDomain(entity: SkuOrmEntity): SkuEntity {
    return new SkuEntity({
      Id: entity.Id,
      SkuCode: entity.SkuCode,
      SkuName: entity.SkuName,
      DefaultOwnerId: entity.DefaultOwnerId,
      ItemClass: entity.ItemClass,
      ItemStatus: entity.ItemStatus as SkuStatus,
      BaseUomId: entity.BaseUomId,
      InventoryUomId: entity.InventoryUomId,
      LotControlled: entity.LotControlled,
      ExpiryControlled: entity.ExpiryControlled,
      SerialControlled: entity.SerialControlled,
      OwnerControlled: entity.OwnerControlled,
      LpnControlled: entity.LpnControlled,
      TemperatureControlled: entity.TemperatureControlled,
      DgControlled: entity.DgControlled,
      CustomsControlled: entity.CustomsControlled,
      QcRequired: entity.QcRequired,
      TemperatureClass: entity.TemperatureClass,
      DgClass: entity.DgClass,
      BondedFlag: entity.BondedFlag,
      ShelfLifeDays: entity.ShelfLifeDays,
      MinRemainingShelfLifeDays: entity.MinRemainingShelfLifeDays,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: SkuEntity): SkuOrmEntity {
    const orm = new SkuOrmEntity();
    orm.Id = entity.Id;
    orm.SkuCode = entity.SkuCode;
    orm.SkuName = entity.SkuName;
    orm.DefaultOwnerId = entity.DefaultOwnerId;
    orm.ItemClass = entity.ItemClass;
    orm.ItemStatus = entity.ItemStatus;
    orm.BaseUomId = entity.BaseUomId;
    orm.InventoryUomId = entity.InventoryUomId;
    orm.LotControlled = entity.LotControlled;
    orm.ExpiryControlled = entity.ExpiryControlled;
    orm.SerialControlled = entity.SerialControlled;
    orm.OwnerControlled = entity.OwnerControlled;
    orm.LpnControlled = entity.LpnControlled;
    orm.TemperatureControlled = entity.TemperatureControlled;
    orm.DgControlled = entity.DgControlled;
    orm.CustomsControlled = entity.CustomsControlled;
    orm.QcRequired = entity.QcRequired;
    orm.TemperatureClass = entity.TemperatureClass;
    orm.DgClass = entity.DgClass;
    orm.BondedFlag = entity.BondedFlag;
    orm.ShelfLifeDays = entity.ShelfLifeDays;
    orm.MinRemainingShelfLifeDays = entity.MinRemainingShelfLifeDays;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
