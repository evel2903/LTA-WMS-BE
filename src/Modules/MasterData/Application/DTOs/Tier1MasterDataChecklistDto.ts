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
import { Tier1ChecklistItemStatus } from '@modules/MasterData/Domain/Enums/Tier1ChecklistItemStatus';

export interface Tier1MasterDataChecklistFixtureDto {
  Site: SiteEntity;
  Warehouse: WarehouseEntity;
  Zone: ZoneEntity;
  LocationProfile: LocationProfileEntity;
  Locations: LocationEntity[];
  Owner: OwnerEntity;
  Uoms: UomEntity[];
  Sku: SkuEntity;
  PackDefinition: PackDefinitionEntity;
  SkuBarcode: SkuBarcodeEntity;
  UomConversion: UomConversionEntity;
  ItemCoverage: ItemCoverageEntity;
  InventoryStatus: InventoryStatusEntity;
  InventoryDimension: InventoryDimensionEntity;
  InventoryBalance: InventoryBalanceEntity;
}

export interface Tier1MasterDataChecklistItemDto {
  Code: string;
  Status: Tier1ChecklistItemStatus;
  Message: string;
  Evidence: string[];
  DeferredToStory: string | null;
}

export interface Tier1MasterDataChecklistDto {
  Items: Tier1MasterDataChecklistItemDto[];
  HasFailures: boolean;
}
