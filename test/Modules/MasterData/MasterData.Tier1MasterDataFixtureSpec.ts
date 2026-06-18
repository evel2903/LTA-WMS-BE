import { Tier1MasterDataFixtureBuilder } from '@modules/MasterData/Application/Services/Tier1MasterDataFixtureBuilder';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

describe('Tier1 master data fixture builder', () => {
  it('creates the minimum Tier 1 master data graph with source trace fields', () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();

    expect(fixture.Site).toMatchObject({
      SiteCode: 'SITE-TIER1',
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
      ReferenceId: 'A6-SITE-TIER1',
    });
    expect(fixture.Warehouse).toMatchObject({
      SiteId: fixture.Site.Id,
      WarehouseTypeCode: 'WT-01',
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
      ReferenceId: 'A6-WH-TIER1',
    });
    expect(fixture.Zone).toMatchObject({
      WarehouseId: fixture.Warehouse.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.LocationProfile).toMatchObject({
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.Locations).toHaveLength(3);
    expect(fixture.Locations.map((location) => location.ParentLocationId)).toEqual([
      null,
      fixture.Locations[0].Id,
      fixture.Locations[1].Id,
    ]);
    expect(fixture.Locations.every((location) => location.LocationStatus === LocationStatus.Active)).toBe(true);
    expect(fixture.Locations.every((location) => location.LocationProfileId === fixture.LocationProfile.Id)).toBe(true);
    expect(fixture.Owner).toMatchObject({ Status: MasterDataStatus.Active, SourceSystem: 'A6Fixture' });
    expect(fixture.Uoms.length).toBeGreaterThanOrEqual(2);
    expect(fixture.Uoms.every((uom) => uom.Status === MasterDataStatus.Active)).toBe(true);
    expect(fixture.Sku).toMatchObject({
      DefaultOwnerId: fixture.Owner.Id,
      ItemStatus: SkuStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.PackDefinition).toMatchObject({
      SkuId: fixture.Sku.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.SkuBarcode).toMatchObject({
      SkuId: fixture.Sku.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.UomConversion).toMatchObject({
      SkuId: fixture.Sku.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.ItemCoverage).toMatchObject({
      SkuId: fixture.Sku.Id,
      WarehouseId: fixture.Warehouse.Id,
      Status: MasterDataStatus.Active,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.InventoryStatus.StatusCode).toBe('AVAILABLE');
    expect(fixture.InventoryDimension).toMatchObject({
      OwnerId: fixture.Owner.Id,
      SkuId: fixture.Sku.Id,
      WarehouseId: fixture.Warehouse.Id,
      LocationId: fixture.Locations[2].Id,
      InventoryStatusId: fixture.InventoryStatus.Id,
      SourceSystem: 'A6Fixture',
    });
    expect(fixture.InventoryBalance).toMatchObject({
      DimensionId: fixture.InventoryDimension.Id,
      QtyOnHand: 10,
      QtyReserved: 2,
      QtyAvailable: 8,
      SourceSystem: 'A6Fixture',
    });
  });
});
