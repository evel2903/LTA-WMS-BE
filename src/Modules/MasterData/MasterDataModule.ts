import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { SiteRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SiteRepository';
import { WarehouseRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/WarehouseRepository';
import { ZoneRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ZoneRepository';
import { LocationProfileRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/LocationProfileRepository';
import { LocationRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/LocationRepository';
import { OwnerRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/OwnerRepository';
import { UomRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomRepository';
import { SkuRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuRepository';
import { SiteController } from '@modules/MasterData/Presentation/Controllers/SiteController';
import { WarehouseController } from '@modules/MasterData/Presentation/Controllers/WarehouseController';
import { ZoneController } from '@modules/MasterData/Presentation/Controllers/ZoneController';
import { LocationProfileController } from '@modules/MasterData/Presentation/Controllers/LocationProfileController';
import { LocationController } from '@modules/MasterData/Presentation/Controllers/LocationController';
import { OwnerController } from '@modules/MasterData/Presentation/Controllers/OwnerController';
import { UomController } from '@modules/MasterData/Presentation/Controllers/UomController';
import { SkuController } from '@modules/MasterData/Presentation/Controllers/SkuController';

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
    ]),
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
    {
      provide: CreateSiteUseCase,
      useFactory: (sites: ISiteRepository) => new CreateSiteUseCase(sites),
      inject: [SITE_REPOSITORY],
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
      useFactory: (sites: ISiteRepository) => new UpdateSiteUseCase(sites),
      inject: [SITE_REPOSITORY],
    },
    {
      provide: CreateWarehouseUseCase,
      useFactory: (warehouses: IWarehouseRepository, sites: ISiteRepository) =>
        new CreateWarehouseUseCase(warehouses, sites),
      inject: [WAREHOUSE_REPOSITORY, SITE_REPOSITORY],
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
      useFactory: (warehouses: IWarehouseRepository, sites: ISiteRepository) =>
        new UpdateWarehouseUseCase(warehouses, sites),
      inject: [WAREHOUSE_REPOSITORY, SITE_REPOSITORY],
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
      useFactory: (zones: IZoneRepository, warehouses: IWarehouseRepository) =>
        new UpdateZoneUseCase(zones, warehouses),
      inject: [ZONE_REPOSITORY, WAREHOUSE_REPOSITORY],
    },
    {
      provide: CreateLocationProfileUseCase,
      useFactory: (locationProfiles: ILocationProfileRepository) => new CreateLocationProfileUseCase(locationProfiles),
      inject: [LOCATION_PROFILE_REPOSITORY],
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
      useFactory: (locationProfiles: ILocationProfileRepository) => new UpdateLocationProfileUseCase(locationProfiles),
      inject: [LOCATION_PROFILE_REPOSITORY],
    },
    {
      provide: CreateLocationUseCase,
      useFactory: (
        locations: ILocationRepository,
        locationProfiles: ILocationProfileRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
      ) => new CreateLocationUseCase(locations, locationProfiles, warehouses, zones),
      inject: [LOCATION_REPOSITORY, LOCATION_PROFILE_REPOSITORY, WAREHOUSE_REPOSITORY, ZONE_REPOSITORY],
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
      ) => new UpdateLocationUseCase(locations, locationProfiles, warehouses, zones),
      inject: [LOCATION_REPOSITORY, LOCATION_PROFILE_REPOSITORY, WAREHOUSE_REPOSITORY, ZONE_REPOSITORY],
    },
    {
      provide: CreateOwnerUseCase,
      useFactory: (owners: IOwnerRepository) => new CreateOwnerUseCase(owners),
      inject: [OWNER_REPOSITORY],
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
      useFactory: (owners: IOwnerRepository) => new UpdateOwnerUseCase(owners),
      inject: [OWNER_REPOSITORY],
    },
    {
      provide: CreateUomUseCase,
      useFactory: (uoms: IUomRepository) => new CreateUomUseCase(uoms),
      inject: [UOM_REPOSITORY],
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
      useFactory: (uoms: IUomRepository) => new UpdateUomUseCase(uoms),
      inject: [UOM_REPOSITORY],
    },
    {
      provide: CreateSkuUseCase,
      useFactory: (skus: ISkuRepository, owners: IOwnerRepository, uoms: IUomRepository) =>
        new CreateSkuUseCase(skus, owners, uoms),
      inject: [SKU_REPOSITORY, OWNER_REPOSITORY, UOM_REPOSITORY],
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
      useFactory: (skus: ISkuRepository, owners: IOwnerRepository, uoms: IUomRepository) =>
        new UpdateSkuUseCase(skus, owners, uoms),
      inject: [SKU_REPOSITORY, OWNER_REPOSITORY, UOM_REPOSITORY],
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
  ],
})
export class MasterDataModule {}
