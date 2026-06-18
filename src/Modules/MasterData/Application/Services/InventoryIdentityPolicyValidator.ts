import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export class InventoryIdentityPolicyValidator {
  public static EnsureActiveOwner(owner: OwnerEntity | null): OwnerEntity {
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    if (owner.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner must be active');
    }
    return owner;
  }

  public static EnsureActiveSku(sku: SkuEntity | null): SkuEntity {
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    if (sku.ItemStatus !== SkuStatus.Active) {
      throw new BusinessRuleException('SKU must be active');
    }
    return sku;
  }

  public static EnsureActiveWarehouse(warehouse: WarehouseEntity | null): WarehouseEntity {
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse must be active');
    }
    return warehouse;
  }

  public static EnsureActiveLocation(location: LocationEntity | null, warehouseId: string): LocationEntity {
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (location.LocationStatus !== LocationStatus.Active) {
      throw new BusinessRuleException('Location must be active');
    }
    if (location.WarehouseId !== warehouseId) {
      throw new BusinessRuleException('Location must belong to dimension warehouse');
    }
    return location;
  }

  public static EnsureActiveInventoryStatus(status: InventoryStatusEntity | null): InventoryStatusEntity {
    if (!status) {
      throw new NotFoundException('Inventory status not found');
    }
    if (status.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Inventory status must be active');
    }
    return status;
  }

  public static EnsureActiveUom(uom: UomEntity | null): UomEntity {
    if (!uom) {
      throw new NotFoundException('UOM not found');
    }
    if (uom.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('UOM must be active');
    }
    return uom;
  }

  public static ValidateQuantities(qtyOnHand: number, qtyReserved: number): void {
    if (!Number.isFinite(qtyOnHand) || !Number.isFinite(qtyReserved)) {
      throw new BusinessRuleException('Quantity fields must be finite numbers');
    }
    if (qtyOnHand < 0 || qtyReserved < 0) {
      throw new BusinessRuleException('Quantity fields must be greater than or equal to zero');
    }
    if (qtyReserved > qtyOnHand) {
      throw new BusinessRuleException('QtyReserved must be less than or equal to QtyOnHand');
    }
  }
}
