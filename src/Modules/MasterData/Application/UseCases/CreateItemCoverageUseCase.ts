import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateItemCoverageDto } from '@modules/MasterData/Application/DTOs/CreateItemCoverageDto';
import { ItemCoverageDto } from '@modules/MasterData/Application/DTOs/ItemCoverageDto';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ItemCoverageMapper } from '@modules/MasterData/Application/Mappers/ItemCoverageMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateItemCoverageUseCase {
  constructor(
    private readonly itemCoverages: IItemCoverageRepository,
    private readonly skus: ISkuRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly owners: IOwnerRepository,
  ) {}

  public async Execute(request: CreateItemCoverageDto): Promise<ItemCoverageDto> {
    const ownerId = request.OwnerId ?? null;
    const duplicate = await this.itemCoverages.FindBySkuWarehouseOwner(request.SkuId, request.WarehouseId, ownerId);
    if (duplicate) {
      throw new ConflictException('Item coverage already exists for SKU, warehouse and owner scope');
    }

    const quantities = {
      MinQty: request.MinQty ?? null,
      MaxQty: request.MaxQty ?? null,
      StandardQty: request.StandardQty ?? null,
      MultipleQty: request.MultipleQty ?? null,
      LeadTimeDays: request.LeadTimeDays ?? null,
    };
    SkuSupportPolicyValidator.ValidateCoverageQuantities(quantities);

    await this.ValidateReferences(
      request.SkuId,
      request.WarehouseId,
      ownerId,
      request.DefaultReceiveWarehouseId ?? null,
      request.DefaultShipWarehouseId ?? null,
      request.Status,
    );

    const now = new Date();
    const coverage = new ItemCoverageEntity({
      Id: randomUUID(),
      SkuId: request.SkuId,
      WarehouseId: request.WarehouseId,
      OwnerId: ownerId,
      ...quantities,
      DefaultReceiveWarehouseId: request.DefaultReceiveWarehouseId ?? null,
      DefaultShipWarehouseId: request.DefaultShipWarehouseId ?? null,
      ReorderPolicy: request.ReorderPolicy ?? null,
      StopReceiving: request.StopReceiving ?? false,
      StopShipping: request.StopShipping ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.itemCoverages.Create(coverage);
    return ItemCoverageMapper.ToDto(created);
  }

  private async ValidateReferences(
    skuId: string,
    warehouseId: string,
    ownerId: string | null,
    defaultReceiveWarehouseId: string | null,
    defaultShipWarehouseId: string | null,
    status: MasterDataStatus,
  ): Promise<void> {
    const sku = await this.skus.FindById(skuId);
    const warehouse = await this.warehouses.FindById(warehouseId);
    const owner = ownerId ? await this.owners.FindById(ownerId) : null;
    const defaultReceiveWarehouse = defaultReceiveWarehouseId
      ? await this.warehouses.FindById(defaultReceiveWarehouseId)
      : null;
    const defaultShipWarehouse = defaultShipWarehouseId ? await this.warehouses.FindById(defaultShipWarehouseId) : null;

    if (status === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveWarehouse(warehouse);
      if (ownerId) {
        SkuSupportPolicyValidator.EnsureActiveOwner(owner);
      }
      if (defaultReceiveWarehouseId) {
        SkuSupportPolicyValidator.EnsureActiveWarehouse(defaultReceiveWarehouse, 'Default receive warehouse');
      }
      if (defaultShipWarehouseId) {
        SkuSupportPolicyValidator.EnsureActiveWarehouse(defaultShipWarehouse, 'Default ship warehouse');
      }
      return;
    }

    SkuSupportPolicyValidator.EnsureSkuExists(sku);
    SkuSupportPolicyValidator.EnsureWarehouseExists(warehouse);
    if (ownerId) {
      SkuSupportPolicyValidator.EnsureOwnerExists(owner);
    }
    if (defaultReceiveWarehouseId) {
      SkuSupportPolicyValidator.EnsureWarehouseExists(defaultReceiveWarehouse, 'Default receive warehouse');
    }
    if (defaultShipWarehouseId) {
      SkuSupportPolicyValidator.EnsureWarehouseExists(defaultShipWarehouse, 'Default ship warehouse');
    }
  }
}
