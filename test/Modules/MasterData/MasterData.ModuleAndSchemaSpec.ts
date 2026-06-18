import TypeOrmDataSource from '@shared/Database/TypeOrmDataSource';
import { AppModule } from '@app/App.module';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';
import { CreateMasterDataSiteWarehouseZone1781622000000 } from '@shared/Database/Migrations/1781622000000-CreateMasterDataSiteWarehouseZone';
import { CreateLocationProfileAndLocation1781623000000 } from '@shared/Database/Migrations/1781623000000-CreateLocationProfileAndLocation';
import { CreateOwnerUomSku1781624000000 } from '@shared/Database/Migrations/1781624000000-CreateOwnerUomSku';
import { CreateSkuSupportTables1781625000000 } from '@shared/Database/Migrations/1781625000000-CreateSkuSupportTables';
import { AddUomConversionOverlapExclusion1781625100000 } from '@shared/Database/Migrations/1781625100000-AddUomConversionOverlapExclusion';
import { CreateInventoryStatusDimensionBalance1781626000000 } from '@shared/Database/Migrations/1781626000000-CreateInventoryStatusDimensionBalance';
import { CreateMasterDataOwnershipPolicy1781627000000 } from '@shared/Database/Migrations/1781627000000-CreateMasterDataOwnershipPolicy';
import { getMetadataArgsStorage } from 'typeorm';

describe('MasterData module and schema registration', () => {
  it('registers MasterDataModule in AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(imports).toEqual(expect.arrayContaining([MasterDataModule]));
  });

  it('registers Site, Warehouse and Zone ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([SiteOrmEntity, WarehouseOrmEntity, ZoneOrmEntity]),
    );
  });

  it('registers LocationProfile and Location ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([LocationProfileOrmEntity, LocationOrmEntity]),
    );
  });

  it('registers Owner, UOM and SKU ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([OwnerOrmEntity, UomOrmEntity, SkuOrmEntity]),
    );
  });

  it('registers SKU support ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([
        SkuBarcodeOrmEntity,
        PackDefinitionOrmEntity,
        UomConversionOrmEntity,
        ItemCoverageOrmEntity,
      ]),
    );
  });

  it('registers inventory status, dimension and balance ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([InventoryStatusOrmEntity, InventoryDimensionOrmEntity, InventoryBalanceOrmEntity]),
    );
  });

  it('registers master data ownership policy ORM entity in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(expect.arrayContaining([MasterDataOwnershipPolicyOrmEntity]));
  });

  it('defines Location ORM relations for warehouse, zone, profile and parent location', () => {
    const relationNames = getMetadataArgsStorage()
      .relations.filter((relation) => relation.target === LocationOrmEntity)
      .map((relation) => relation.propertyName);

    expect(relationNames).toEqual(expect.arrayContaining(['Warehouse', 'Zone', 'LocationProfile', 'ParentLocation']));
  });

  it('does not expose public mutation controllers for inventory dimensions or balances in A5', () => {
    const controllers = (Reflect.getMetadata('controllers', MasterDataModule) as Array<{ name: string }>) ?? [];
    const controllerNames = controllers.map((controller) => controller.name);

    expect(controllerNames).not.toEqual(
      expect.arrayContaining(['InventoryDimensionController', 'InventoryBalanceController']),
    );
  });

  it('does not expose public mutation controllers for A6 ownership policy or Tier 1 checklist', () => {
    const controllers = (Reflect.getMetadata('controllers', MasterDataModule) as Array<{ name: string }>) ?? [];
    const controllerNames = controllers.map((controller) => controller.name);

    expect(controllerNames).not.toEqual(
      expect.arrayContaining(['MasterDataOwnershipPolicyMutationController', 'Tier1MasterDataFixtureController']),
    );
  });

  it('provides a migration for sites, warehouses, zones, FKs and unique constraints', async () => {
    const migration = new CreateMasterDataSiteWarehouseZone1781622000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "sites"');
    expect(sql).toContain('create table "warehouses"');
    expect(sql).toContain('create table "zones"');
    expect(sql).toContain('foreign key ("site_id") references "sites"("id")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
    expect(sql).toContain('unique ("site_code")');
    expect(sql).toContain('unique ("warehouse_code")');
    expect(sql).toContain('unique ("warehouse_id", "zone_code")');
  });

  it('provides a migration for location profiles, locations, FKs and unique location code per warehouse', async () => {
    const migration = new CreateLocationProfileAndLocation1781623000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "location_profiles"');
    expect(sql).toContain('create table "locations"');
    expect(sql).toContain('unique ("profile_code")');
    expect(sql).toContain('unique ("warehouse_id", "location_code")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
    expect(sql).toContain('foreign key ("zone_id") references "zones"("id")');
    expect(sql).toContain('foreign key ("location_profile_id") references "location_profiles"("id")');
    expect(sql).toContain('foreign key ("parent_location_id") references "locations"("id")');
  });

  it('provides a migration for owners, uoms, skus, FKs and global unique business codes', async () => {
    const migration = new CreateOwnerUomSku1781624000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "owners"');
    expect(sql).toContain('create table "uoms"');
    expect(sql).toContain('create table "skus"');
    expect(sql).toContain('unique ("owner_code")');
    expect(sql).toContain('unique ("uom_code")');
    expect(sql).toContain('unique ("sku_code")');
    expect(sql).toContain('foreign key ("default_owner_id") references "owners"("id")');
    expect(sql).toContain('foreign key ("base_uom_id") references "uoms"("id")');
    expect(sql).toContain('foreign key ("inventory_uom_id") references "uoms"("id")');
  });

  it('provides a migration for SKU support tables, FKs and scoped unique constraints', async () => {
    const migration = new CreateSkuSupportTables1781625000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "pack_definitions"');
    expect(sql).toContain('create table "uom_conversions"');
    expect(sql).toContain('create table "sku_barcodes"');
    expect(sql).toContain('create table "item_coverages"');
    expect(sql).toContain('unique ("sku_id", "pack_code")');
    expect(sql).toContain('unique ("sku_id", "from_uom_id", "to_uom_id", "effective_from")');
    expect(sql).toContain('where owner_id is null');
    expect(sql).toContain('where owner_id is not null');
    expect(sql).toContain('foreign key ("sku_id") references "skus"("id")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
  });

  it('provides DB-level protection against active UOM conversion window overlap', async () => {
    const migration = new AddUomConversionOverlapExclusion1781625100000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create extension if not exists btree_gist');
    expect(sql).toContain('add constraint "ex_uom_conversions_active_window_overlap"');
    expect(sql).toContain('exclude using gist');
    expect(sql).toContain('"sku_id" with =');
    expect(sql).toContain('"from_uom_id" with =');
    expect(sql).toContain('"to_uom_id" with =');
    expect(sql).toContain(
      'tstzrange("effective_from", coalesce("effective_to", \'infinity\'::timestamptz), \'[]\') with &&',
    );
    expect(sql).toContain("where (status = 'active')");
  });

  it('provides a migration for inventory statuses, dimensions, balances, FKs and unique constraints', async () => {
    const migration = new CreateInventoryStatusDimensionBalance1781626000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "inventory_statuses"');
    expect(sql).toContain('create table "inventory_dimensions"');
    expect(sql).toContain('create table "inventory_balances"');
    expect(sql).toContain('unique ("status_code")');
    expect(sql).toContain('unique ("dimension_key_hash")');
    expect(sql).toContain('unique ("dimension_id")');
    expect(sql).toContain('foreign key ("owner_id") references "owners"("id")');
    expect(sql).toContain('foreign key ("sku_id") references "skus"("id")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
    expect(sql).toContain('foreign key ("location_id") references "locations"("id")');
    expect(sql).toContain('foreign key ("inventory_status_id") references "inventory_statuses"("id")');
    expect(sql).toContain('foreign key ("uom_id") references "uoms"("id")');
    expect(sql).toContain('foreign key ("dimension_id") references "inventory_dimensions"("id")');
    expect(sql).toContain('check ("qty_on_hand" >= 0)');
    expect(sql).toContain('check ("qty_reserved" >= 0)');
    expect(sql).toContain('check ("qty_available" >= 0)');
    expect(sql).toContain('check ("qty_reserved" <= "qty_on_hand")');
    expect(sql).toContain('check ("qty_available" = "qty_on_hand" - "qty_reserved")');
    expect(sql).toContain('available');
  });

  it('provides a migration for master data ownership policy catalog and FR-8 seed rows', async () => {
    const migration = new CreateMasterDataOwnershipPolicy1781627000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "master_data_ownership_policies"');
    expect(sql).toContain('unique ("object_group")');
    expect(sql).toContain('source_of_truth_type');
    expect(sql).toContain('ownership_mode');
    expect(sql).toContain('requires_audit');
    expect(sql).toContain('requires_reason');
    expect(sql).toContain('requires_source_system');
    expect(sql).toContain('requires_reference_id');
    expect(sql).toContain('implementation_status');
    expect(sql).toContain('reasoncode');
    expect(sql).toContain('lpnsscc');
    expect(sql).toContain('doc04#14');
  });
});
