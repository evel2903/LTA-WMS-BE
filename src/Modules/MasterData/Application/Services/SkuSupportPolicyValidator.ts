import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export class SkuSupportPolicyValidator {
  public static EnsureSkuExists(sku: SkuEntity | null): SkuEntity {
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    return sku;
  }

  public static EnsureActiveSku(sku: SkuEntity | null): SkuEntity {
    const existing = SkuSupportPolicyValidator.EnsureSkuExists(sku);
    if (existing.ItemStatus !== SkuStatus.Active) {
      throw new BusinessRuleException('SKU must be active');
    }
    return existing;
  }

  public static EnsureUomExists(uom: UomEntity | null, label = 'UOM'): UomEntity {
    if (!uom) {
      throw new NotFoundException(`${label} not found`);
    }
    return uom;
  }

  public static EnsureActiveUom(uom: UomEntity | null, label = 'UOM'): UomEntity {
    const existing = SkuSupportPolicyValidator.EnsureUomExists(uom, label);
    if (existing.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException(`${label} must be active`);
    }
    return existing;
  }

  public static EnsureOwnerExists(owner: OwnerEntity | null): OwnerEntity {
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    return owner;
  }

  public static EnsureActiveOwner(owner: OwnerEntity | null): OwnerEntity {
    const existing = SkuSupportPolicyValidator.EnsureOwnerExists(owner);
    if (existing.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner must be active');
    }
    return existing;
  }

  public static EnsureWarehouseExists(warehouse: WarehouseEntity | null, label = 'Warehouse'): WarehouseEntity {
    if (!warehouse) {
      throw new NotFoundException(`${label} not found`);
    }
    return warehouse;
  }

  public static EnsureActiveWarehouse(warehouse: WarehouseEntity | null, label = 'Warehouse'): WarehouseEntity {
    const existing = SkuSupportPolicyValidator.EnsureWarehouseExists(warehouse, label);
    if (existing.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException(`${label} must be active`);
    }
    return existing;
  }

  public static EnsureActivePack(
    pack: PackDefinitionEntity | null,
    skuId: string,
    uomId: string,
  ): PackDefinitionEntity {
    if (!pack) {
      throw new NotFoundException('Pack definition not found');
    }
    if (pack.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Pack definition must be active');
    }
    if (pack.SkuId !== skuId || pack.UomId !== uomId) {
      throw new BusinessRuleException('Pack definition must match SKU and UOM');
    }
    return pack;
  }

  public static ValidatePackQuantity(quantityPerPack: number): void {
    if (quantityPerPack <= 0) {
      throw new BusinessRuleException('QuantityPerPack must be greater than zero');
    }
  }

  public static ValidateConversionWindow(
    fromUomId: string,
    toUomId: string,
    factor: number,
    effectiveFrom: Date,
    effectiveTo: Date | null,
  ): void {
    if (fromUomId === toUomId) {
      throw new BusinessRuleException('FromUomId and ToUomId must be different');
    }
    if (factor <= 0) {
      throw new BusinessRuleException('Factor must be greater than zero');
    }
    if (!effectiveFrom || Number.isNaN(effectiveFrom.getTime())) {
      throw new BusinessRuleException('EffectiveFrom is required');
    }
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BusinessRuleException('EffectiveTo must be greater than EffectiveFrom');
    }
  }

  public static ValidateCoverageQuantities(input: {
    MinQty: number | null;
    MaxQty: number | null;
    StandardQty: number | null;
    MultipleQty: number | null;
    LeadTimeDays: number | null;
  }): void {
    for (const value of [input.MinQty, input.MaxQty, input.StandardQty]) {
      if (value !== null && value < 0) {
        throw new BusinessRuleException('Quantity fields must be greater than or equal to zero');
      }
    }
    if (input.MultipleQty !== null && input.MultipleQty <= 0) {
      throw new BusinessRuleException('MultipleQty must be greater than zero');
    }
    if (input.MinQty !== null && input.MaxQty !== null && input.MaxQty < input.MinQty) {
      throw new BusinessRuleException('MaxQty must be greater than or equal to MinQty');
    }
    if (input.LeadTimeDays !== null && input.LeadTimeDays < 0) {
      throw new BusinessRuleException('LeadTimeDays must be greater than or equal to zero');
    }
  }
}
