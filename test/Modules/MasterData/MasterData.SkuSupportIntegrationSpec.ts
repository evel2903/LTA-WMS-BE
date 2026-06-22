import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { CreateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuBarcodeUseCase';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { ResolveSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/ResolveSkuBarcodeUseCase';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

const Now = new Date('2026-01-01T00:00:00.000Z');

class MemoryOwnerRepository implements IOwnerRepository {
  private readonly owners = new Map<string, OwnerEntity>([
    [
      'owner-1',
      new OwnerEntity({
        Id: 'owner-1',
        OwnerCode: 'OWNER-A',
        OwnerName: 'Owner A',
        Status: MasterDataStatus.Active,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    ],
  ]);

  public async FindById(id: string): Promise<OwnerEntity | null> {
    return this.owners.get(id) ?? null;
  }

  public async FindByCode(ownerCode: string): Promise<OwnerEntity | null> {
    return [...this.owners.values()].find((owner) => owner.OwnerCode === ownerCode) ?? null;
  }

  public async Create(owner: OwnerEntity): Promise<OwnerEntity> {
    this.owners.set(owner.Id, owner);
    return owner;
  }

  public async Update(owner: OwnerEntity): Promise<OwnerEntity> {
    this.owners.set(owner.Id, owner);
    return owner;
  }

  public async List(): Promise<{ Items: OwnerEntity[]; TotalItems: number }> {
    const items = [...this.owners.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryUomRepository implements IUomRepository {
  private readonly uoms = new Map<string, UomEntity>([
    [
      'uom-ea',
      new UomEntity({
        Id: 'uom-ea',
        UomCode: 'EA',
        UomName: 'Each',
        Status: MasterDataStatus.Active,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    ],
    [
      'uom-case',
      new UomEntity({
        Id: 'uom-case',
        UomCode: 'CASE',
        UomName: 'Case',
        Status: MasterDataStatus.Active,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    ],
  ]);

  public async FindById(id: string): Promise<UomEntity | null> {
    return this.uoms.get(id) ?? null;
  }

  public async FindByCode(uomCode: string): Promise<UomEntity | null> {
    return [...this.uoms.values()].find((uom) => uom.UomCode === uomCode) ?? null;
  }

  public async Create(uom: UomEntity): Promise<UomEntity> {
    this.uoms.set(uom.Id, uom);
    return uom;
  }

  public async Update(uom: UomEntity): Promise<UomEntity> {
    this.uoms.set(uom.Id, uom);
    return uom;
  }

  public async List(): Promise<{ Items: UomEntity[]; TotalItems: number }> {
    const items = [...this.uoms.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemorySkuRepository implements ISkuRepository {
  private readonly skus = new Map<string, SkuEntity>();

  public async FindById(id: string): Promise<SkuEntity | null> {
    return this.skus.get(id) ?? null;
  }

  public async FindByCode(skuCode: string): Promise<SkuEntity | null> {
    return [...this.skus.values()].find((sku) => sku.SkuCode === skuCode) ?? null;
  }

  public async Create(sku: SkuEntity): Promise<SkuEntity> {
    this.skus.set(sku.Id, sku);
    return sku;
  }

  public async Update(sku: SkuEntity): Promise<SkuEntity> {
    this.skus.set(sku.Id, sku);
    return sku;
  }

  public async List(): Promise<{ Items: SkuEntity[]; TotalItems: number }> {
    const items = [...this.skus.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryWarehouseRepository implements IWarehouseRepository {
  private readonly warehouses = new Map<string, WarehouseEntity>([
    [
      'warehouse-tier-1',
      new WarehouseEntity({
        Id: 'warehouse-tier-1',
        SiteId: 'site-1',
        WarehouseCode: 'WH-TIER-1',
        WarehouseName: 'Tier 1 Warehouse',
        WarehouseTypeCode: 'TIER_1',
        Status: MasterDataStatus.Active,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    ],
  ]);

  public async FindById(id: string): Promise<WarehouseEntity | null> {
    return this.warehouses.get(id) ?? null;
  }

  public async FindByCode(warehouseCode: string): Promise<WarehouseEntity | null> {
    return [...this.warehouses.values()].find((warehouse) => warehouse.WarehouseCode === warehouseCode) ?? null;
  }

  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async List(): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    const items = [...this.warehouses.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryPackDefinitionRepository implements IPackDefinitionRepository {
  private readonly packs = new Map<string, PackDefinitionEntity>();

  public async FindById(id: string): Promise<PackDefinitionEntity | null> {
    return this.packs.get(id) ?? null;
  }

  public async FindBySkuAndPackCode(skuId: string, packCode: string): Promise<PackDefinitionEntity | null> {
    return [...this.packs.values()].find((pack) => pack.SkuId === skuId && pack.PackCode === packCode) ?? null;
  }

  public async FindActiveDefaultBySkuId(skuId: string): Promise<PackDefinitionEntity | null> {
    return (
      [...this.packs.values()].find(
        (pack) => pack.SkuId === skuId && pack.IsDefault && pack.Status === MasterDataStatus.Active,
      ) ?? null
    );
  }

  public async Create(pack: PackDefinitionEntity): Promise<PackDefinitionEntity> {
    this.packs.set(pack.Id, pack);
    return pack;
  }

  public async Update(pack: PackDefinitionEntity): Promise<PackDefinitionEntity> {
    this.packs.set(pack.Id, pack);
    return pack;
  }

  public async List(): Promise<{ Items: PackDefinitionEntity[]; TotalItems: number }> {
    const items = [...this.packs.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryUomConversionRepository implements IUomConversionRepository {
  private readonly conversions = new Map<string, UomConversionEntity>();

  public async FindById(id: string): Promise<UomConversionEntity | null> {
    return this.conversions.get(id) ?? null;
  }

  public async FindByUniqueKey(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    effectiveFrom: Date,
  ): Promise<UomConversionEntity | null> {
    return (
      [...this.conversions.values()].find(
        (conversion) =>
          conversion.SkuId === skuId &&
          conversion.FromUomId === fromUomId &&
          conversion.ToUomId === toUomId &&
          conversion.EffectiveFrom.getTime() === effectiveFrom.getTime(),
      ) ?? null
    );
  }

  public async FindActiveOverlap(): Promise<UomConversionEntity | null> {
    return null;
  }

  public async Create(conversion: UomConversionEntity): Promise<UomConversionEntity> {
    this.conversions.set(conversion.Id, conversion);
    return conversion;
  }

  public async Update(conversion: UomConversionEntity): Promise<UomConversionEntity> {
    this.conversions.set(conversion.Id, conversion);
    return conversion;
  }

  public async List(): Promise<{ Items: UomConversionEntity[]; TotalItems: number }> {
    const items = [...this.conversions.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemorySkuBarcodeRepository implements ISkuBarcodeRepository {
  private readonly barcodes = new Map<string, SkuBarcodeEntity>();

  public async FindById(id: string): Promise<SkuBarcodeEntity | null> {
    return this.barcodes.get(id) ?? null;
  }

  public async FindByValueAndOwner(barcodeValue: string, ownerId: string | null): Promise<SkuBarcodeEntity | null> {
    return (
      [...this.barcodes.values()].find(
        (barcode) => barcode.BarcodeValue === barcodeValue && barcode.OwnerId === ownerId,
      ) ?? null
    );
  }

  public async FindCandidatesByValue(barcodeValue: string): Promise<SkuBarcodeEntity[]> {
    return [...this.barcodes.values()].filter((barcode) => barcode.BarcodeValue === barcodeValue);
  }

  public async Create(barcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity> {
    this.barcodes.set(barcode.Id, barcode);
    return barcode;
  }

  public async Update(barcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity> {
    this.barcodes.set(barcode.Id, barcode);
    return barcode;
  }

  public async List(): Promise<{ Items: SkuBarcodeEntity[]; TotalItems: number }> {
    const items = [...this.barcodes.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryItemCoverageRepository implements IItemCoverageRepository {
  private readonly coverages = new Map<string, ItemCoverageEntity>();

  public async FindById(id: string): Promise<ItemCoverageEntity | null> {
    return this.coverages.get(id) ?? null;
  }

  public async FindBySkuWarehouseOwner(
    skuId: string,
    warehouseId: string,
    ownerId: string | null,
  ): Promise<ItemCoverageEntity | null> {
    return (
      [...this.coverages.values()].find(
        (coverage) => coverage.SkuId === skuId && coverage.WarehouseId === warehouseId && coverage.OwnerId === ownerId,
      ) ?? null
    );
  }

  public async Create(coverage: ItemCoverageEntity): Promise<ItemCoverageEntity> {
    this.coverages.set(coverage.Id, coverage);
    return coverage;
  }

  public async Update(coverage: ItemCoverageEntity): Promise<ItemCoverageEntity> {
    this.coverages.set(coverage.Id, coverage);
    return coverage;
  }

  public async List(): Promise<{ Items: ItemCoverageEntity[]; TotalItems: number }> {
    const items = [...this.coverages.values()];
    return { Items: items, TotalItems: items.length };
  }
}

describe('SKU support integration fixture', () => {
  it('creates SKU with pack, conversion, barcode resolve and Tier 1 warehouse coverage', async () => {
    const owners = new MemoryOwnerRepository();
    const uoms = new MemoryUomRepository();
    const skus = new MemorySkuRepository();
    const warehouses = new MemoryWarehouseRepository();
    const packs = new MemoryPackDefinitionRepository();
    const conversions = new MemoryUomConversionRepository();
    const barcodes = new MemorySkuBarcodeRepository();
    const coverages = new MemoryItemCoverageRepository();

    const sku = await new CreateSkuUseCase(skus, owners, uoms).Execute({
      SkuCode: 'SKU-A4-001',
      SkuName: 'A4 Test SKU',
      DefaultOwnerId: 'owner-1',
      ItemClass: 'DRY',
      ItemStatus: SkuStatus.Active,
      BaseUomId: 'uom-ea',
      InventoryUomId: 'uom-ea',
      OwnerControlled: true,
    });

    const pack = await new CreatePackDefinitionUseCase(packs, skus, uoms).Execute({
      SkuId: sku.Id,
      PackCode: 'CASE',
      PackName: 'Case',
      UomId: 'uom-ea',
      QuantityPerPack: 12,
      IsDefault: true,
      Status: MasterDataStatus.Active,
    });

    const conversion = await new CreateUomConversionUseCase(conversions, skus, uoms).Execute({
      SkuId: sku.Id,
      FromUomId: 'uom-case',
      ToUomId: 'uom-ea',
      Factor: 12,
      EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      Status: MasterDataStatus.Active,
    });

    const barcode = await new CreateSkuBarcodeUseCase(barcodes, packs, skus, owners, uoms).Execute({
      SkuId: sku.Id,
      OwnerId: 'owner-1',
      UomId: 'uom-ea',
      PackCode: pack.PackCode,
      BarcodeValue: '0123456789012',
      BarcodeType: 'EAN13',
      Status: MasterDataStatus.Active,
    });

    const resolved = await new ResolveSkuBarcodeUseCase(barcodes).Execute({
      BarcodeValue: barcode.BarcodeValue,
      OwnerId: 'owner-1',
    });

    const coverage = await new CreateItemCoverageUseCase(coverages, skus, warehouses, owners).Execute({
      SkuId: sku.Id,
      WarehouseId: 'warehouse-tier-1',
      OwnerId: 'owner-1',
      MinQty: 10,
      MaxQty: 100,
      StandardQty: 24,
      MultipleQty: 6,
      LeadTimeDays: 2,
      DefaultReceiveWarehouseId: 'warehouse-tier-1',
      DefaultShipWarehouseId: 'warehouse-tier-1',
      ReorderPolicy: { Method: 'MinMax' },
      Status: MasterDataStatus.Active,
    });

    expect(pack.SkuId).toBe(sku.Id);
    expect(conversion.Factor).toBe(12);
    expect(resolved.SkuId).toBe(sku.Id);
    expect(resolved.UomId).toBe('uom-ea');
    expect(resolved.PackCode).toBe('CASE');
    expect(coverage.WarehouseId).toBe('warehouse-tier-1');
    expect(coverage.MultipleQty).toBe(6);
  });
});
