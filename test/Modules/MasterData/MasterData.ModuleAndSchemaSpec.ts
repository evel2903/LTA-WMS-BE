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
import { CreateMasterDataSiteWarehouseZone1781622000000 } from '@shared/Database/Migrations/1781622000000-CreateMasterDataSiteWarehouseZone';
import { CreateLocationProfileAndLocation1781623000000 } from '@shared/Database/Migrations/1781623000000-CreateLocationProfileAndLocation';
import { CreateOwnerUomSku1781624000000 } from '@shared/Database/Migrations/1781624000000-CreateOwnerUomSku';
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

  it('defines Location ORM relations for warehouse, zone, profile and parent location', () => {
    const relationNames = getMetadataArgsStorage()
      .relations.filter((relation) => relation.target === LocationOrmEntity)
      .map((relation) => relation.propertyName);

    expect(relationNames).toEqual(expect.arrayContaining(['Warehouse', 'Zone', 'LocationProfile', 'ParentLocation']));
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
});
