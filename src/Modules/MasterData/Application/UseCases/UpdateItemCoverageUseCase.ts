import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ItemCoverageDto } from '@modules/MasterData/Application/DTOs/ItemCoverageDto';
import { UpdateItemCoverageDto } from '@modules/MasterData/Application/DTOs/UpdateItemCoverageDto';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ItemCoverageMapper } from '@modules/MasterData/Application/Mappers/ItemCoverageMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateItemCoverageUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. ItemCoverage is AUDIT-ONLY (no A6 ownership group),
  // so there is no ownership policy or reason-code handling here.
  constructor(
    private readonly itemCoverages: IItemCoverageRepository,
    private readonly skus: ISkuRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly owners: IOwnerRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateItemCoverageDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ItemCoverageDto> {
    const coverage = await this.itemCoverages.FindById(request.Id);
    if (!coverage) {
      throw new NotFoundException('Item coverage not found');
    }
    const before = ItemCoverageMapper.ToDto(coverage) as unknown as Record<string, unknown>;

    const targetSkuId = request.SkuId ?? coverage.SkuId;
    const targetWarehouseId = request.WarehouseId ?? coverage.WarehouseId;
    const targetOwnerId = request.OwnerId !== undefined ? request.OwnerId : coverage.OwnerId;
    const targetStatus = request.Status ?? coverage.Status;
    const quantities = {
      MinQty: request.MinQty !== undefined ? request.MinQty : coverage.MinQty,
      MaxQty: request.MaxQty !== undefined ? request.MaxQty : coverage.MaxQty,
      StandardQty: request.StandardQty !== undefined ? request.StandardQty : coverage.StandardQty,
      MultipleQty: request.MultipleQty !== undefined ? request.MultipleQty : coverage.MultipleQty,
      LeadTimeDays: request.LeadTimeDays !== undefined ? request.LeadTimeDays : coverage.LeadTimeDays,
    };
    SkuSupportPolicyValidator.ValidateCoverageQuantities(quantities);

    const scopeChanged =
      targetSkuId !== coverage.SkuId ||
      targetWarehouseId !== coverage.WarehouseId ||
      targetOwnerId !== coverage.OwnerId;
    if (scopeChanged) {
      const duplicate = await this.itemCoverages.FindBySkuWarehouseOwner(
        targetSkuId,
        targetWarehouseId,
        targetOwnerId ?? null,
      );
      if (duplicate && duplicate.Id !== coverage.Id) {
        throw new ConflictException('Item coverage already exists for SKU, warehouse and owner scope');
      }
    }

    const targetDefaultReceiveWarehouseId =
      request.DefaultReceiveWarehouseId !== undefined
        ? request.DefaultReceiveWarehouseId
        : coverage.DefaultReceiveWarehouseId;
    const targetDefaultShipWarehouseId =
      request.DefaultShipWarehouseId !== undefined ? request.DefaultShipWarehouseId : coverage.DefaultShipWarehouseId;

    await this.ValidateReferences(
      targetSkuId,
      targetWarehouseId,
      targetOwnerId ?? null,
      targetDefaultReceiveWarehouseId,
      targetDefaultShipWarehouseId,
      targetStatus,
    );

    coverage.SkuId = targetSkuId;
    coverage.WarehouseId = targetWarehouseId;
    coverage.OwnerId = targetOwnerId ?? null;
    coverage.MinQty = quantities.MinQty;
    coverage.MaxQty = quantities.MaxQty;
    coverage.StandardQty = quantities.StandardQty;
    coverage.MultipleQty = quantities.MultipleQty;
    coverage.LeadTimeDays = quantities.LeadTimeDays;
    coverage.DefaultReceiveWarehouseId = targetDefaultReceiveWarehouseId;
    coverage.DefaultShipWarehouseId = targetDefaultShipWarehouseId;
    coverage.ReorderPolicy = request.ReorderPolicy !== undefined ? request.ReorderPolicy : coverage.ReorderPolicy;
    coverage.StopReceiving = request.StopReceiving ?? coverage.StopReceiving;
    coverage.StopShipping = request.StopShipping ?? coverage.StopShipping;
    coverage.Status = targetStatus;
    coverage.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : coverage.SourceSystem;
    coverage.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : coverage.ReferenceId;
    coverage.UpdatedAt = new Date();

    const buildEntry = (updated: ItemCoverageEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.ItemCoverage,
        ObjectId: updated.Id,
        ObjectCode: null,
        BeforeJson: before,
        AfterJson: ItemCoverageMapper.ToDto(updated) as unknown as Record<string, unknown>,
        WarehouseId: updated.WarehouseId,
        OwnerId: updated.OwnerId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.itemCoverages.Update(coverage);
      return ItemCoverageMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.itemCoverages.Update(coverage, manager);
      return { result: ItemCoverageMapper.ToDto(updated), entry: buildEntry(updated) };
    });
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
