import { BusinessRuleException } from '@common/Exceptions/AppException';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';

export class SkuPolicyValidator {
  public static Validate(sku: SkuEntity): void {
    if (sku.OwnerControlled && !sku.DefaultOwnerId) {
      throw new BusinessRuleException('Owner controlled SKU requires DefaultOwnerId');
    }
    if (sku.ExpiryControlled && (!sku.ShelfLifeDays || sku.ShelfLifeDays <= 0)) {
      throw new BusinessRuleException('Expiry controlled SKU requires positive ShelfLifeDays');
    }
    if (sku.TemperatureControlled && !sku.TemperatureClass) {
      throw new BusinessRuleException('Temperature controlled SKU requires TemperatureClass');
    }
    if (sku.DgControlled && !sku.DgClass) {
      throw new BusinessRuleException('DG controlled SKU requires DgClass');
    }
    if (sku.CustomsControlled && sku.BondedFlag !== true) {
      throw new BusinessRuleException('Customs controlled SKU requires BondedFlag');
    }
  }
}
