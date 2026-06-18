import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export type ScopeReferenceInput = {
  WarehouseId?: string | null;
  ZoneId?: string | null;
  OwnerId?: string | null;
  SkuId?: string | null;
};

/**
 * Validates that any non-null scope reference exists and is active, via the master-data ports.
 * `null` is allowed (wildcard / explicit clear); `undefined` is skipped (PATCH "no change").
 */
export class ScopeReferenceValidator {
  constructor(
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly zoneRepository: IZoneRepository,
    private readonly ownerRepository: IOwnerRepository,
    private readonly skuRepository: ISkuRepository,
  ) {}

  public async Assert(input: ScopeReferenceInput): Promise<void> {
    if (input.WarehouseId !== undefined && input.WarehouseId !== null) {
      const warehouse = await this.warehouseRepository.FindById(input.WarehouseId);
      if (!warehouse) throw new NotFoundException('Warehouse not found');
      if (warehouse.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Warehouse scope reference must be active');
      }
    }
    if (input.ZoneId !== undefined && input.ZoneId !== null) {
      const zone = await this.zoneRepository.FindById(input.ZoneId);
      if (!zone) throw new NotFoundException('Zone not found');
      if (zone.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Zone scope reference must be active');
      }
    }
    if (input.OwnerId !== undefined && input.OwnerId !== null) {
      const owner = await this.ownerRepository.FindById(input.OwnerId);
      if (!owner) throw new NotFoundException('Owner not found');
      if (owner.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Owner scope reference must be active');
      }
    }
    if (input.SkuId !== undefined && input.SkuId !== null) {
      const sku = await this.skuRepository.FindById(input.SkuId);
      if (!sku) throw new NotFoundException('SKU not found');
      if (sku.ItemStatus !== SkuStatus.Active) {
        throw new BusinessRuleException('SKU scope reference must be active');
      }
    }
  }
}
