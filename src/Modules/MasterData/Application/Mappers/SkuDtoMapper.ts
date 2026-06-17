import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { SkuRuleFactsDto } from '@modules/MasterData/Application/DTOs/SkuRuleFactsDto';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';

export class SkuDtoMapper {
  public static ToDto(sku: SkuEntity): SkuDto {
    return {
      Id: sku.Id,
      SkuCode: sku.SkuCode,
      SkuName: sku.SkuName,
      DefaultOwnerId: sku.DefaultOwnerId,
      ItemClass: sku.ItemClass,
      ItemStatus: sku.ItemStatus,
      BaseUomId: sku.BaseUomId,
      InventoryUomId: sku.InventoryUomId,
      LotControlled: sku.LotControlled,
      ExpiryControlled: sku.ExpiryControlled,
      SerialControlled: sku.SerialControlled,
      OwnerControlled: sku.OwnerControlled,
      LpnControlled: sku.LpnControlled,
      TemperatureControlled: sku.TemperatureControlled,
      DgControlled: sku.DgControlled,
      CustomsControlled: sku.CustomsControlled,
      QcRequired: sku.QcRequired,
      TemperatureClass: sku.TemperatureClass,
      DgClass: sku.DgClass,
      BondedFlag: sku.BondedFlag,
      ShelfLifeDays: sku.ShelfLifeDays,
      MinRemainingShelfLifeDays: sku.MinRemainingShelfLifeDays,
      SourceSystem: sku.SourceSystem,
      ReferenceId: sku.ReferenceId,
      CreatedAt: sku.CreatedAt,
      UpdatedAt: sku.UpdatedAt,
      CreatedBy: sku.CreatedBy,
      UpdatedBy: sku.UpdatedBy,
    };
  }

  public static ToRuleFacts(sku: SkuEntity): SkuRuleFactsDto {
    return {
      SkuId: sku.Id,
      SkuCode: sku.SkuCode,
      ItemClass: sku.ItemClass,
      ItemStatus: sku.ItemStatus,
      DefaultOwnerId: sku.DefaultOwnerId,
      BaseUomId: sku.BaseUomId,
      InventoryUomId: sku.InventoryUomId,
      LotControlled: sku.LotControlled,
      ExpiryControlled: sku.ExpiryControlled,
      SerialControlled: sku.SerialControlled,
      OwnerControlled: sku.OwnerControlled,
      LpnControlled: sku.LpnControlled,
      TemperatureControlled: sku.TemperatureControlled,
      DgControlled: sku.DgControlled,
      CustomsControlled: sku.CustomsControlled,
      QcRequired: sku.QcRequired,
      TemperatureClass: sku.TemperatureClass,
      DgClass: sku.DgClass,
      BondedFlag: sku.BondedFlag,
      ShelfLifeDays: sku.ShelfLifeDays,
      MinRemainingShelfLifeDays: sku.MinRemainingShelfLifeDays,
    };
  }
}
