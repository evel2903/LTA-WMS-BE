import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  MasterDataOwnershipPolicyService,
  MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
} from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { GetSiteByIdUseCase } from '@modules/MasterData/Application/UseCases/GetSiteByIdUseCase';
import { ListSitesUseCase } from '@modules/MasterData/Application/UseCases/ListSitesUseCase';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseByIdUseCase';
import { ListWarehousesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetZoneByIdUseCase } from '@modules/MasterData/Application/UseCases/GetZoneByIdUseCase';
import { ListZonesUseCase } from '@modules/MasterData/Application/UseCases/ListZonesUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { GetLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/GetLocationProfileUseCase';
import { ListLocationProfilesUseCase } from '@modules/MasterData/Application/UseCases/ListLocationProfilesUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { GetLocationUseCase } from '@modules/MasterData/Application/UseCases/GetLocationUseCase';
import { GetLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetLocationTreeUseCase';
import { ListLocationsUseCase } from '@modules/MasterData/Application/UseCases/ListLocationsUseCase';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { GetOwnerUseCase } from '@modules/MasterData/Application/UseCases/GetOwnerUseCase';
import { ListOwnersUseCase } from '@modules/MasterData/Application/UseCases/ListOwnersUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { CreateUomUseCase } from '@modules/MasterData/Application/UseCases/CreateUomUseCase';
import { GetUomUseCase } from '@modules/MasterData/Application/UseCases/GetUomUseCase';
import { ListUomsUseCase } from '@modules/MasterData/Application/UseCases/ListUomsUseCase';
import { UpdateUomUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomUseCase';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { GetSkuUseCase } from '@modules/MasterData/Application/UseCases/GetSkuUseCase';
import { GetSkuRuleFactsUseCase } from '@modules/MasterData/Application/UseCases/GetSkuRuleFactsUseCase';
import { ListSkusUseCase } from '@modules/MasterData/Application/UseCases/ListSkusUseCase';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { GetPackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/GetPackDefinitionUseCase';
import { ListPackDefinitionsUseCase } from '@modules/MasterData/Application/UseCases/ListPackDefinitionsUseCase';
import { UpdatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/UpdatePackDefinitionUseCase';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { GetUomConversionUseCase } from '@modules/MasterData/Application/UseCases/GetUomConversionUseCase';
import { ListUomConversionsUseCase } from '@modules/MasterData/Application/UseCases/ListUomConversionsUseCase';
import { UpdateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomConversionUseCase';
import { CreateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuBarcodeUseCase';
import { GetSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/GetSkuBarcodeUseCase';
import { ListSkuBarcodesUseCase } from '@modules/MasterData/Application/UseCases/ListSkuBarcodesUseCase';
import { ResolveSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/ResolveSkuBarcodeUseCase';
import { UpdateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuBarcodeUseCase';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { GetItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/GetItemCoverageUseCase';
import { ListItemCoveragesUseCase } from '@modules/MasterData/Application/UseCases/ListItemCoveragesUseCase';
import { UpdateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/UpdateItemCoverageUseCase';
import { GetInventoryStatusUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryStatusUseCase';
import { ListInventoryStatusesUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryStatusesUseCase';
import { CreateInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/CreateInventoryDimensionUseCase';
import { GetInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryDimensionUseCase';
import { ListInventoryDimensionsUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryDimensionsUseCase';
import { InitializeInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/InitializeInventoryBalanceUseCase';
import { GetInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryBalanceUseCase';
import { ListInventoryBalancesUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryBalancesUseCase';
import { ListMasterDataOwnershipPoliciesUseCase } from '@modules/MasterData/Application/UseCases/ListMasterDataOwnershipPoliciesUseCase';
import { VerifyTier1MasterDataChecklistUseCase } from '@modules/MasterData/Application/UseCases/VerifyTier1MasterDataChecklistUseCase';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { Tier1MasterDataChecklistService } from '@modules/MasterData/Application/Services/Tier1MasterDataChecklistService';
import { ISiteRepository, SITE_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository, ZONE_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import {
  ILocationProfileRepository,
  LOCATION_PROFILE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IOwnerRepository, OWNER_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IUomRepository, UOM_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { ISkuRepository, SKU_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import {
  IPackDefinitionRepository,
  PACK_DEFINITION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import {
  IUomConversionRepository,
  UOM_CONVERSION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import {
  ISkuBarcodeRepository,
  SKU_BARCODE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import {
  IItemCoverageRepository,
  ITEM_COVERAGE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import {
  IInventoryStatusRepository,
  INVENTORY_STATUS_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import {
  IInventoryDimensionRepository,
  INVENTORY_DIMENSION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import {
  IInventoryBalanceRepository,
  INVENTORY_BALANCE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import {
  IMasterDataOwnershipPolicyRepository,
  MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';
import { SiteRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SiteRepository';
import { WarehouseRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/WarehouseRepository';
import { ZoneRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ZoneRepository';
import { LocationProfileRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/LocationProfileRepository';
import { LocationRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/LocationRepository';
import { OwnerRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/OwnerRepository';
import { UomRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomRepository';
import { SkuRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuRepository';
import { PackDefinitionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/PackDefinitionRepository';
import { UomConversionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomConversionRepository';
import { SkuBarcodeRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuBarcodeRepository';
import { ItemCoverageRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ItemCoverageRepository';
import { InventoryStatusRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/InventoryStatusRepository';
import { InventoryDimensionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/InventoryDimensionRepository';
import { InventoryBalanceRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/InventoryBalanceRepository';
import { MasterDataOwnershipPolicyRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/MasterDataOwnershipPolicyRepository';
import { SiteController } from '@modules/MasterData/Presentation/Controllers/SiteController';
import { WarehouseController } from '@modules/MasterData/Presentation/Controllers/WarehouseController';
import { ZoneController } from '@modules/MasterData/Presentation/Controllers/ZoneController';
import { LocationProfileController } from '@modules/MasterData/Presentation/Controllers/LocationProfileController';
import { LocationController } from '@modules/MasterData/Presentation/Controllers/LocationController';
import { OwnerController } from '@modules/MasterData/Presentation/Controllers/OwnerController';
import { UomController } from '@modules/MasterData/Presentation/Controllers/UomController';
import { SkuController } from '@modules/MasterData/Presentation/Controllers/SkuController';
import { PackDefinitionController } from '@modules/MasterData/Presentation/Controllers/PackDefinitionController';
import { UomConversionController } from '@modules/MasterData/Presentation/Controllers/UomConversionController';
import { SkuBarcodeController } from '@modules/MasterData/Presentation/Controllers/SkuBarcodeController';
import { ItemCoverageController } from '@modules/MasterData/Presentation/Controllers/ItemCoverageController';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteOrmEntity,
      WarehouseOrmEntity,
      ZoneOrmEntity,
      LocationProfileOrmEntity,
      LocationOrmEntity,
      OwnerOrmEntity,
      UomOrmEntity,
      SkuOrmEntity,
      PackDefinitionOrmEntity,
      UomConversionOrmEntity,
      SkuBarcodeOrmEntity,
      ItemCoverageOrmEntity,
      InventoryStatusOrmEntity,
      InventoryDimensionOrmEntity,
      InventoryBalanceOrmEntity,
      MasterDataOwnershipPolicyOrmEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [
    SiteController,
    WarehouseController,
    ZoneController,
    LocationProfileController,
    LocationController,
    OwnerController,
    UomController,
    SkuController,
    PackDefinitionController,
    UomConversionController,
    SkuBarcodeController,
    ItemCoverageController,
  ],
  providers: [
    { provide: SITE_REPOSITORY, useClass: SiteRepository },
    { provide: WAREHOUSE_REPOSITORY, useClass: WarehouseRepository },
    { provide: ZONE_REPOSITORY, useClass: ZoneRepository },
    { provide: LOCATION_PROFILE_REPOSITORY, useClass: LocationProfileRepository },
    { provide: LOCATION_REPOSITORY, useClass: LocationRepository },
    { provide: OWNER_REPOSITORY, useClass: OwnerRepository },
    { provide: UOM_REPOSITORY, useClass: UomRepository },
    { provide: SKU_REPOSITORY, useClass: SkuRepository },
    { provide: PACK_DEFINITION_REPOSITORY, useClass: PackDefinitionRepository },
    { provide: UOM_CONVERSION_REPOSITORY, useClass: UomConversionRepository },
    { provide: SKU_BARCODE_REPOSITORY, useClass: SkuBarcodeRepository },
    { provide: ITEM_COVERAGE_REPOSITORY, useClass: ItemCoverageRepository },
    { provide: INVENTORY_STATUS_REPOSITORY, useClass: InventoryStatusRepository },
    { provide: INVENTORY_DIMENSION_REPOSITORY, useClass: InventoryDimensionRepository },
    { provide: INVENTORY_BALANCE_REPOSITORY, useClass: InventoryBalanceRepository },
    { provide: MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY, useClass: MasterDataOwnershipPolicyRepository },
    {
      provide: MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
      useFactory: (policies: IMasterDataOwnershipPolicyRepository, reasonCatalog: IReasonCodeCatalog) =>
        new MasterDataOwnershipPolicyService(policies, reasonCatalog),
      inject: [MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY, REASON_CODE_CATALOG],
    },
    InventoryDimensionKeyService,
    Tier1MasterDataChecklistService,
    {
      provide: CreateSiteUseCase,
      useFactory: (sites: ISiteRepository, ownership: MasterDataOwnershipPolicyService, audited: AuditedTransaction) =>
        new CreateSiteUseCase(sites, ownership, audited),
      inject: [SITE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: GetSiteByIdUseCase,
      useFactory: (sites: ISiteRepository) => new GetSiteByIdUseCase(sites),
      inject: [SITE_REPOSITORY],
    },
    {
      provide: ListSitesUseCase,
      useFactory: (sites: ISiteRepository) => new ListSitesUseCase(sites),
      inject: [SITE_REPOSITORY],
    },
    {
      provide: UpdateSiteUseCase,
      useFactory: (sites: ISiteRepository, ownership: MasterDataOwnershipPolicyService, audited: AuditedTransaction) =>
        new UpdateSiteUseCase(sites, ownership, audited),
      inject: [SITE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: CreateWarehouseUseCase,
      useFactory: (
        warehouses: IWarehouseRepository,
        sites: ISiteRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateWarehouseUseCase(warehouses, sites, ownership, audited),
      inject: [WAREHOUSE_REPOSITORY, SITE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: GetWarehouseByIdUseCase,
      useFactory: (warehouses: IWarehouseRepository) => new GetWarehouseByIdUseCase(warehouses),
      inject: [WAREHOUSE_REPOSITORY],
    },
    {
      provide: ListWarehousesUseCase,
      useFactory: (warehouses: IWarehouseRepository) => new ListWarehousesUseCase(warehouses),
      inject: [WAREHOUSE_REPOSITORY],
    },
    {
      provide: UpdateWarehouseUseCase,
      useFactory: (
        warehouses: IWarehouseRepository,
        sites: ISiteRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateWarehouseUseCase(warehouses, sites, ownership, audited),
      inject: [WAREHOUSE_REPOSITORY, SITE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: CreateZoneUseCase,
      useFactory: (zones: IZoneRepository, warehouses: IWarehouseRepository) =>
        new CreateZoneUseCase(zones, warehouses),
      inject: [ZONE_REPOSITORY, WAREHOUSE_REPOSITORY],
    },
    {
      provide: GetZoneByIdUseCase,
      useFactory: (zones: IZoneRepository) => new GetZoneByIdUseCase(zones),
      inject: [ZONE_REPOSITORY],
    },
    {
      provide: ListZonesUseCase,
      useFactory: (zones: IZoneRepository) => new ListZonesUseCase(zones),
      inject: [ZONE_REPOSITORY],
    },
    {
      provide: UpdateZoneUseCase,
      useFactory: (zones: IZoneRepository, warehouses: IWarehouseRepository, checker: IPermissionChecker) =>
        new UpdateZoneUseCase(zones, warehouses, checker),
      inject: [ZONE_REPOSITORY, WAREHOUSE_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: CreateLocationProfileUseCase,
      useFactory: (
        locationProfiles: ILocationProfileRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateLocationProfileUseCase(locationProfiles, ownership, audited),
      inject: [LOCATION_PROFILE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: GetLocationProfileUseCase,
      useFactory: (locationProfiles: ILocationProfileRepository) => new GetLocationProfileUseCase(locationProfiles),
      inject: [LOCATION_PROFILE_REPOSITORY],
    },
    {
      provide: ListLocationProfilesUseCase,
      useFactory: (locationProfiles: ILocationProfileRepository) => new ListLocationProfilesUseCase(locationProfiles),
      inject: [LOCATION_PROFILE_REPOSITORY],
    },
    {
      provide: UpdateLocationProfileUseCase,
      useFactory: (
        locationProfiles: ILocationProfileRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateLocationProfileUseCase(locationProfiles, ownership, audited),
      inject: [LOCATION_PROFILE_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: CreateLocationUseCase,
      useFactory: (
        locations: ILocationRepository,
        locationProfiles: ILocationProfileRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateLocationUseCase(locations, locationProfiles, warehouses, zones, ownership, audited),
      inject: [
        LOCATION_REPOSITORY,
        LOCATION_PROFILE_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ZONE_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: GetLocationUseCase,
      useFactory: (locations: ILocationRepository) => new GetLocationUseCase(locations),
      inject: [LOCATION_REPOSITORY],
    },
    {
      provide: ListLocationsUseCase,
      useFactory: (locations: ILocationRepository) => new ListLocationsUseCase(locations),
      inject: [LOCATION_REPOSITORY],
    },
    {
      provide: GetLocationTreeUseCase,
      useFactory: (locations: ILocationRepository) => new GetLocationTreeUseCase(locations),
      inject: [LOCATION_REPOSITORY],
    },
    {
      provide: UpdateLocationUseCase,
      useFactory: (
        locations: ILocationRepository,
        locationProfiles: ILocationProfileRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateLocationUseCase(locations, locationProfiles, warehouses, zones, ownership, audited),
      inject: [
        LOCATION_REPOSITORY,
        LOCATION_PROFILE_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ZONE_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: CreateOwnerUseCase,
      useFactory: (
        owners: IOwnerRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateOwnerUseCase(owners, ownership, audited),
      inject: [OWNER_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: GetOwnerUseCase,
      useFactory: (owners: IOwnerRepository) => new GetOwnerUseCase(owners),
      inject: [OWNER_REPOSITORY],
    },
    {
      provide: ListOwnersUseCase,
      useFactory: (owners: IOwnerRepository) => new ListOwnersUseCase(owners),
      inject: [OWNER_REPOSITORY],
    },
    {
      provide: UpdateOwnerUseCase,
      useFactory: (
        owners: IOwnerRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateOwnerUseCase(owners, ownership, audited),
      inject: [OWNER_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: CreateUomUseCase,
      useFactory: (uoms: IUomRepository, ownership: MasterDataOwnershipPolicyService, audited: AuditedTransaction) =>
        new CreateUomUseCase(uoms, ownership, audited),
      inject: [UOM_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: GetUomUseCase,
      useFactory: (uoms: IUomRepository) => new GetUomUseCase(uoms),
      inject: [UOM_REPOSITORY],
    },
    {
      provide: ListUomsUseCase,
      useFactory: (uoms: IUomRepository) => new ListUomsUseCase(uoms),
      inject: [UOM_REPOSITORY],
    },
    {
      provide: UpdateUomUseCase,
      useFactory: (uoms: IUomRepository, ownership: MasterDataOwnershipPolicyService, audited: AuditedTransaction) =>
        new UpdateUomUseCase(uoms, ownership, audited),
      inject: [UOM_REPOSITORY, MASTER_DATA_OWNERSHIP_POLICY_SERVICE, AuditedTransaction],
    },
    {
      provide: CreateSkuUseCase,
      useFactory: (
        skus: ISkuRepository,
        owners: IOwnerRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateSkuUseCase(skus, owners, uoms, ownership, audited),
      inject: [
        SKU_REPOSITORY,
        OWNER_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: GetSkuUseCase,
      useFactory: (skus: ISkuRepository) => new GetSkuUseCase(skus),
      inject: [SKU_REPOSITORY],
    },
    {
      provide: GetSkuRuleFactsUseCase,
      useFactory: (skus: ISkuRepository) => new GetSkuRuleFactsUseCase(skus),
      inject: [SKU_REPOSITORY],
    },
    {
      provide: ListSkusUseCase,
      useFactory: (skus: ISkuRepository) => new ListSkusUseCase(skus),
      inject: [SKU_REPOSITORY],
    },
    {
      provide: UpdateSkuUseCase,
      useFactory: (
        skus: ISkuRepository,
        owners: IOwnerRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateSkuUseCase(skus, owners, uoms, ownership, audited),
      inject: [
        SKU_REPOSITORY,
        OWNER_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: CreatePackDefinitionUseCase,
      useFactory: (
        packDefinitions: IPackDefinitionRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreatePackDefinitionUseCase(packDefinitions, skus, uoms, ownership, audited),
      inject: [
        PACK_DEFINITION_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: GetPackDefinitionUseCase,
      useFactory: (packDefinitions: IPackDefinitionRepository) => new GetPackDefinitionUseCase(packDefinitions),
      inject: [PACK_DEFINITION_REPOSITORY],
    },
    {
      provide: ListPackDefinitionsUseCase,
      useFactory: (packDefinitions: IPackDefinitionRepository) => new ListPackDefinitionsUseCase(packDefinitions),
      inject: [PACK_DEFINITION_REPOSITORY],
    },
    {
      provide: UpdatePackDefinitionUseCase,
      useFactory: (
        packDefinitions: IPackDefinitionRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdatePackDefinitionUseCase(packDefinitions, skus, uoms, ownership, audited),
      inject: [
        PACK_DEFINITION_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: CreateUomConversionUseCase,
      useFactory: (
        uomConversions: IUomConversionRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateUomConversionUseCase(uomConversions, skus, uoms, ownership, audited),
      inject: [
        UOM_CONVERSION_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: GetUomConversionUseCase,
      useFactory: (uomConversions: IUomConversionRepository) => new GetUomConversionUseCase(uomConversions),
      inject: [UOM_CONVERSION_REPOSITORY],
    },
    {
      provide: ListUomConversionsUseCase,
      useFactory: (uomConversions: IUomConversionRepository) => new ListUomConversionsUseCase(uomConversions),
      inject: [UOM_CONVERSION_REPOSITORY],
    },
    {
      provide: UpdateUomConversionUseCase,
      useFactory: (
        uomConversions: IUomConversionRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateUomConversionUseCase(uomConversions, skus, uoms, ownership, audited),
      inject: [
        UOM_CONVERSION_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: CreateSkuBarcodeUseCase,
      useFactory: (
        skuBarcodes: ISkuBarcodeRepository,
        packDefinitions: IPackDefinitionRepository,
        skus: ISkuRepository,
        owners: IOwnerRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new CreateSkuBarcodeUseCase(skuBarcodes, packDefinitions, skus, owners, uoms, ownership, audited),
      inject: [
        SKU_BARCODE_REPOSITORY,
        PACK_DEFINITION_REPOSITORY,
        SKU_REPOSITORY,
        OWNER_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: GetSkuBarcodeUseCase,
      useFactory: (skuBarcodes: ISkuBarcodeRepository) => new GetSkuBarcodeUseCase(skuBarcodes),
      inject: [SKU_BARCODE_REPOSITORY],
    },
    {
      provide: ListSkuBarcodesUseCase,
      useFactory: (skuBarcodes: ISkuBarcodeRepository) => new ListSkuBarcodesUseCase(skuBarcodes),
      inject: [SKU_BARCODE_REPOSITORY],
    },
    {
      provide: ResolveSkuBarcodeUseCase,
      useFactory: (skuBarcodes: ISkuBarcodeRepository) => new ResolveSkuBarcodeUseCase(skuBarcodes),
      inject: [SKU_BARCODE_REPOSITORY],
    },
    {
      provide: UpdateSkuBarcodeUseCase,
      useFactory: (
        skuBarcodes: ISkuBarcodeRepository,
        packDefinitions: IPackDefinitionRepository,
        skus: ISkuRepository,
        owners: IOwnerRepository,
        uoms: IUomRepository,
        ownership: MasterDataOwnershipPolicyService,
        audited: AuditedTransaction,
      ) => new UpdateSkuBarcodeUseCase(skuBarcodes, packDefinitions, skus, owners, uoms, ownership, audited),
      inject: [
        SKU_BARCODE_REPOSITORY,
        PACK_DEFINITION_REPOSITORY,
        SKU_REPOSITORY,
        OWNER_REPOSITORY,
        UOM_REPOSITORY,
        MASTER_DATA_OWNERSHIP_POLICY_SERVICE,
        AuditedTransaction,
      ],
    },
    {
      provide: CreateItemCoverageUseCase,
      useFactory: (
        itemCoverages: IItemCoverageRepository,
        skus: ISkuRepository,
        warehouses: IWarehouseRepository,
        owners: IOwnerRepository,
        audited: AuditedTransaction,
      ) => new CreateItemCoverageUseCase(itemCoverages, skus, warehouses, owners, audited),
      inject: [ITEM_COVERAGE_REPOSITORY, SKU_REPOSITORY, WAREHOUSE_REPOSITORY, OWNER_REPOSITORY, AuditedTransaction],
    },
    {
      provide: GetItemCoverageUseCase,
      useFactory: (itemCoverages: IItemCoverageRepository) => new GetItemCoverageUseCase(itemCoverages),
      inject: [ITEM_COVERAGE_REPOSITORY],
    },
    {
      provide: ListItemCoveragesUseCase,
      useFactory: (itemCoverages: IItemCoverageRepository) => new ListItemCoveragesUseCase(itemCoverages),
      inject: [ITEM_COVERAGE_REPOSITORY],
    },
    {
      provide: UpdateItemCoverageUseCase,
      useFactory: (
        itemCoverages: IItemCoverageRepository,
        skus: ISkuRepository,
        warehouses: IWarehouseRepository,
        owners: IOwnerRepository,
        audited: AuditedTransaction,
      ) => new UpdateItemCoverageUseCase(itemCoverages, skus, warehouses, owners, audited),
      inject: [ITEM_COVERAGE_REPOSITORY, SKU_REPOSITORY, WAREHOUSE_REPOSITORY, OWNER_REPOSITORY, AuditedTransaction],
    },
    {
      provide: GetInventoryStatusUseCase,
      useFactory: (inventoryStatuses: IInventoryStatusRepository) => new GetInventoryStatusUseCase(inventoryStatuses),
      inject: [INVENTORY_STATUS_REPOSITORY],
    },
    {
      provide: ListInventoryStatusesUseCase,
      useFactory: (inventoryStatuses: IInventoryStatusRepository) =>
        new ListInventoryStatusesUseCase(inventoryStatuses),
      inject: [INVENTORY_STATUS_REPOSITORY],
    },
    {
      provide: CreateInventoryDimensionUseCase,
      useFactory: (
        inventoryDimensions: IInventoryDimensionRepository,
        owners: IOwnerRepository,
        skus: ISkuRepository,
        warehouses: IWarehouseRepository,
        locations: ILocationRepository,
        inventoryStatuses: IInventoryStatusRepository,
        uoms: IUomRepository,
        keyService: InventoryDimensionKeyService,
      ) =>
        new CreateInventoryDimensionUseCase(
          inventoryDimensions,
          owners,
          skus,
          warehouses,
          locations,
          inventoryStatuses,
          uoms,
          keyService,
        ),
      inject: [
        INVENTORY_DIMENSION_REPOSITORY,
        OWNER_REPOSITORY,
        SKU_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        LOCATION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        UOM_REPOSITORY,
        InventoryDimensionKeyService,
      ],
    },
    {
      provide: GetInventoryDimensionUseCase,
      useFactory: (inventoryDimensions: IInventoryDimensionRepository) =>
        new GetInventoryDimensionUseCase(inventoryDimensions),
      inject: [INVENTORY_DIMENSION_REPOSITORY],
    },
    {
      provide: ListInventoryDimensionsUseCase,
      useFactory: (inventoryDimensions: IInventoryDimensionRepository) =>
        new ListInventoryDimensionsUseCase(inventoryDimensions),
      inject: [INVENTORY_DIMENSION_REPOSITORY],
    },
    {
      provide: InitializeInventoryBalanceUseCase,
      useFactory: (
        inventoryBalances: IInventoryBalanceRepository,
        inventoryDimensions: IInventoryDimensionRepository,
      ) => new InitializeInventoryBalanceUseCase(inventoryBalances, inventoryDimensions),
      inject: [INVENTORY_BALANCE_REPOSITORY, INVENTORY_DIMENSION_REPOSITORY],
    },
    {
      provide: GetInventoryBalanceUseCase,
      useFactory: (inventoryBalances: IInventoryBalanceRepository) => new GetInventoryBalanceUseCase(inventoryBalances),
      inject: [INVENTORY_BALANCE_REPOSITORY],
    },
    {
      provide: ListInventoryBalancesUseCase,
      useFactory: (inventoryBalances: IInventoryBalanceRepository) =>
        new ListInventoryBalancesUseCase(inventoryBalances),
      inject: [INVENTORY_BALANCE_REPOSITORY],
    },
    {
      provide: ListMasterDataOwnershipPoliciesUseCase,
      useFactory: (policies: IMasterDataOwnershipPolicyRepository) =>
        new ListMasterDataOwnershipPoliciesUseCase(policies),
      inject: [MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY],
    },
    {
      provide: VerifyTier1MasterDataChecklistUseCase,
      useFactory: (policies: IMasterDataOwnershipPolicyRepository, checklistService: Tier1MasterDataChecklistService) =>
        new VerifyTier1MasterDataChecklistUseCase(policies, checklistService),
      inject: [MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY, Tier1MasterDataChecklistService],
    },
  ],
  exports: [
    SITE_REPOSITORY,
    WAREHOUSE_REPOSITORY,
    ZONE_REPOSITORY,
    LOCATION_PROFILE_REPOSITORY,
    LOCATION_REPOSITORY,
    OWNER_REPOSITORY,
    UOM_REPOSITORY,
    SKU_REPOSITORY,
    PACK_DEFINITION_REPOSITORY,
    UOM_CONVERSION_REPOSITORY,
    SKU_BARCODE_REPOSITORY,
    ITEM_COVERAGE_REPOSITORY,
    INVENTORY_STATUS_REPOSITORY,
    INVENTORY_DIMENSION_REPOSITORY,
    INVENTORY_BALANCE_REPOSITORY,
    MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY,
  ],
})
export class MasterDataModule {}
