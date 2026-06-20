import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateInventoryDimensionDto } from '@modules/MasterData/Application/DTOs/CreateInventoryDimensionDto';
import { InventoryDimensionDto } from '@modules/MasterData/Application/DTOs/InventoryDimensionDto';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { InventoryDimensionMapper } from '@modules/MasterData/Application/Mappers/InventoryDimensionMapper';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { InventoryIdentityPolicyValidator } from '@modules/MasterData/Application/Services/InventoryIdentityPolicyValidator';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

export class CreateInventoryDimensionUseCase {
  // Inventory dimension is an operational record (not in the A6 master-data ownership
  // catalog) → audit-only: no ownership enforcement, just an in-transaction audit record.
  // auditedTransaction is optional so fixture-setup tests construct bare; module wires it.
  constructor(
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly owners: IOwnerRepository,
    private readonly skus: ISkuRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly locations: ILocationRepository,
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly uoms: IUomRepository,
    private readonly keyService: InventoryDimensionKeyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateInventoryDimensionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InventoryDimensionDto> {
    const normalized = {
      OwnerId: request.OwnerId,
      SkuId: request.SkuId,
      WarehouseId: request.WarehouseId,
      LocationId: request.LocationId,
      InventoryStatusId: request.InventoryStatusId,
      UomId: this.keyService.NormalizeOptionalString(request.UomId, 'UomId'),
      LpnCode: this.keyService.NormalizeOptionalString(request.LpnCode, 'LpnCode'),
      LotNumber: this.keyService.NormalizeOptionalString(request.LotNumber, 'LotNumber'),
      ExpiryDate: this.keyService.NormalizeOptionalDate(request.ExpiryDate, 'ExpiryDate'),
      SerialNumber: this.keyService.NormalizeOptionalString(request.SerialNumber, 'SerialNumber'),
      ProductionDate: this.keyService.NormalizeOptionalDate(request.ProductionDate, 'ProductionDate'),
      CountryOfOrigin: this.keyService.NormalizeOptionalString(request.CountryOfOrigin, 'CountryOfOrigin'),
      CustomsStatus: this.keyService.NormalizeOptionalString(request.CustomsStatus, 'CustomsStatus'),
    };
    const dimensionKeyHash = this.keyService.BuildHash(normalized);
    const duplicate = await this.inventoryDimensions.FindByHash(dimensionKeyHash);
    if (duplicate) {
      throw new ConflictException('Inventory dimension already exists for identity');
    }

    await this.ValidateReferences(normalized);

    const now = new Date();
    const dimension = new InventoryDimensionEntity({
      Id: randomUUID(),
      ...normalized,
      DimensionKeyHash: dimensionKeyHash,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: InventoryDimensionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.InventoryStatus,
        ObjectId: created.Id,
        ObjectCode: created.DimensionKeyHash,
        AfterJson: InventoryDimensionMapper.ToDto(created) as unknown as Record<string, unknown>,
        WarehouseId: created.WarehouseId,
        OwnerId: created.OwnerId,
      });

    if (!this.auditedTransaction) {
      const created = await this.inventoryDimensions.Create(dimension);
      return InventoryDimensionMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.inventoryDimensions.Create(dimension, manager);
      return { result: InventoryDimensionMapper.ToDto(created), entry: buildEntry(created) };
    });
  }

  private async ValidateReferences(input: {
    OwnerId: string;
    SkuId: string;
    WarehouseId: string;
    LocationId: string;
    InventoryStatusId: string;
    UomId: string | null;
  }): Promise<void> {
    const [owner, sku, warehouse, location, inventoryStatus, uom] = await Promise.all([
      this.owners.FindById(input.OwnerId),
      this.skus.FindById(input.SkuId),
      this.warehouses.FindById(input.WarehouseId),
      this.locations.FindById(input.LocationId),
      this.inventoryStatuses.FindById(input.InventoryStatusId),
      input.UomId ? this.uoms.FindById(input.UomId) : Promise.resolve(null),
    ]);

    InventoryIdentityPolicyValidator.EnsureActiveOwner(owner);
    InventoryIdentityPolicyValidator.EnsureActiveSku(sku);
    InventoryIdentityPolicyValidator.EnsureActiveWarehouse(warehouse);
    InventoryIdentityPolicyValidator.EnsureActiveLocation(location, input.WarehouseId);
    InventoryIdentityPolicyValidator.EnsureActiveInventoryStatus(inventoryStatus);
    if (input.UomId) {
      InventoryIdentityPolicyValidator.EnsureActiveUom(uom);
    }
  }
}
