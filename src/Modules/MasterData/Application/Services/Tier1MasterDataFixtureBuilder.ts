import { Tier1MasterDataChecklistFixtureDto } from '@modules/MasterData/Application/DTOs/Tier1MasterDataChecklistDto';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

const now = new Date('2026-01-01T00:00:00.000Z');
const sourceSystem = 'A6Fixture';

export class Tier1MasterDataFixtureBuilder {
  public Build(): Tier1MasterDataChecklistFixtureDto {
    const site = new SiteEntity({
      Id: '00000000-0000-0000-0000-00000000a601',
      SiteCode: 'SITE-TIER1',
      SiteName: 'Tier 1 Site',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-SITE-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const warehouse = new WarehouseEntity({
      Id: '00000000-0000-0000-0000-00000000a602',
      SiteId: site.Id,
      WarehouseCode: 'WH-TIER1',
      WarehouseName: 'Tier 1 Warehouse',
      WarehouseTypeCode: 'WT-01',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-WH-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const zone = new ZoneEntity({
      Id: '00000000-0000-0000-0000-00000000a603',
      WarehouseId: warehouse.Id,
      ZoneCode: 'ZONE-A',
      ZoneName: 'Storage Zone A',
      ZoneType: 'Storage',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-ZONE-A',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const locationProfile = new LocationProfileEntity({
      Id: '00000000-0000-0000-0000-00000000a604',
      ProfileCode: 'LP-STORAGE',
      ProfileName: 'Storage Location Profile',
      LocationType: 'Storage',
      Status: MasterDataStatus.Active,
      CapacityPolicy: { CapacityRequired: true },
      MixPolicy: { MixSkuPolicy: 'NoMix', MixOwnerPolicy: 'NoMix' },
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-LP-STORAGE',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const locations = [
      new LocationEntity({
        Id: '00000000-0000-0000-0000-00000000a605',
        WarehouseId: warehouse.Id,
        ZoneId: zone.Id,
        LocationCode: 'A',
        LocationName: 'Aisle A',
        LocationType: 'Aisle',
        LocationProfileId: locationProfile.Id,
        LocationStatus: LocationStatus.Active,
        SourceSystem: sourceSystem,
        ReferenceId: 'A6-LOC-A',
        CreatedAt: now,
        UpdatedAt: now,
      }),
      new LocationEntity({
        Id: '00000000-0000-0000-0000-00000000a606',
        WarehouseId: warehouse.Id,
        ZoneId: zone.Id,
        ParentLocationId: '00000000-0000-0000-0000-00000000a605',
        LocationCode: 'A-01',
        LocationName: 'Bay A-01',
        LocationType: 'Bay',
        LocationProfileId: locationProfile.Id,
        LocationStatus: LocationStatus.Active,
        SourceSystem: sourceSystem,
        ReferenceId: 'A6-LOC-A-01',
        CreatedAt: now,
        UpdatedAt: now,
      }),
      new LocationEntity({
        Id: '00000000-0000-0000-0000-00000000a607',
        WarehouseId: warehouse.Id,
        ZoneId: zone.Id,
        ParentLocationId: '00000000-0000-0000-0000-00000000a606',
        LocationCode: 'A-01-01',
        LocationName: 'Bin A-01-01',
        LocationType: 'Bin',
        LocationProfileId: locationProfile.Id,
        LocationStatus: LocationStatus.Active,
        CapacityQty: 100,
        MixSkuPolicy: 'NoMix',
        MixOwnerPolicy: 'NoMix',
        SourceSystem: sourceSystem,
        ReferenceId: 'A6-LOC-A-01-01',
        CreatedAt: now,
        UpdatedAt: now,
      }),
    ];

    const owner = new OwnerEntity({
      Id: '00000000-0000-0000-0000-00000000a608',
      OwnerCode: 'OWNER-T1',
      OwnerName: 'Tier 1 Owner',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-OWNER-T1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const eachUom = new UomEntity({
      Id: '00000000-0000-0000-0000-00000000a609',
      UomCode: 'EA',
      UomName: 'Each',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-UOM-EA',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const caseUom = new UomEntity({
      Id: '00000000-0000-0000-0000-00000000a610',
      UomCode: 'CASE',
      UomName: 'Case',
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-UOM-CASE',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const sku = new SkuEntity({
      Id: '00000000-0000-0000-0000-00000000a611',
      SkuCode: 'SKU-TIER1',
      SkuName: 'Tier 1 SKU',
      DefaultOwnerId: owner.Id,
      ItemClass: 'DRY',
      ItemStatus: SkuStatus.Active,
      BaseUomId: eachUom.Id,
      InventoryUomId: eachUom.Id,
      LotControlled: true,
      ExpiryControlled: true,
      OwnerControlled: true,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-SKU-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const packDefinition = new PackDefinitionEntity({
      Id: '00000000-0000-0000-0000-00000000a612',
      SkuId: sku.Id,
      PackCode: 'CASE12',
      PackName: 'Case of 12',
      UomId: caseUom.Id,
      QuantityPerPack: 12,
      IsDefault: true,
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-PACK-CASE12',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const skuBarcode = new SkuBarcodeEntity({
      Id: '00000000-0000-0000-0000-00000000a613',
      SkuId: sku.Id,
      OwnerId: owner.Id,
      UomId: caseUom.Id,
      PackCode: packDefinition.PackCode,
      BarcodeValue: '8990000000001',
      BarcodeType: 'EAN13',
      IsPrimary: true,
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-BARCODE-8990000000001',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const uomConversion = new UomConversionEntity({
      Id: '00000000-0000-0000-0000-00000000a614',
      SkuId: sku.Id,
      FromUomId: caseUom.Id,
      ToUomId: eachUom.Id,
      Factor: 12,
      EffectiveFrom: now,
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-CONV-CASE-EA',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const itemCoverage = new ItemCoverageEntity({
      Id: '00000000-0000-0000-0000-00000000a615',
      SkuId: sku.Id,
      WarehouseId: warehouse.Id,
      OwnerId: owner.Id,
      MinQty: 10,
      MaxQty: 1000,
      StandardQty: 120,
      MultipleQty: 12,
      LeadTimeDays: 2,
      DefaultReceiveWarehouseId: warehouse.Id,
      DefaultShipWarehouseId: warehouse.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-COVERAGE-SKU-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const inventoryStatus = new InventoryStatusEntity({
      Id: '00000000-0000-0000-0000-000000000201',
      StatusCode: 'AVAILABLE',
      DisplayName: 'Available',
      StageGroup: 'StorageControl',
      AllowsAllocation: true,
      AllowsPick: true,
      IsTerminal: false,
      IsMilestone: false,
      SortOrder: 100,
      Status: MasterDataStatus.Active,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-STATUS-AVAILABLE',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const inventoryDimension = new InventoryDimensionEntity({
      Id: '00000000-0000-0000-0000-00000000a616',
      OwnerId: owner.Id,
      SkuId: sku.Id,
      WarehouseId: warehouse.Id,
      LocationId: locations[2].Id,
      InventoryStatusId: inventoryStatus.Id,
      DimensionKeyHash: 'b'.repeat(64),
      UomId: eachUom.Id,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-DIM-SKU-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    const inventoryBalance = new InventoryBalanceEntity({
      Id: '00000000-0000-0000-0000-00000000a617',
      DimensionId: inventoryDimension.Id,
      QtyOnHand: 10,
      QtyReserved: 2,
      SourceSystem: sourceSystem,
      ReferenceId: 'A6-BAL-SKU-TIER1',
      CreatedAt: now,
      UpdatedAt: now,
    });

    return {
      Site: site,
      Warehouse: warehouse,
      Zone: zone,
      LocationProfile: locationProfile,
      Locations: locations,
      Owner: owner,
      Uoms: [eachUom, caseUom],
      Sku: sku,
      PackDefinition: packDefinition,
      SkuBarcode: skuBarcode,
      UomConversion: uomConversion,
      ItemCoverage: itemCoverage,
      InventoryStatus: inventoryStatus,
      InventoryDimension: inventoryDimension,
      InventoryBalance: inventoryBalance,
    };
  }
}
