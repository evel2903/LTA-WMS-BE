import { GetLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetLocationTreeUseCase';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

class FakeLocationRepository implements ILocationRepository {
  public FindById = jest.fn<Promise<LocationEntity | null>, [string]>();
  public FindByWarehouseAndCode = jest.fn<Promise<LocationEntity | null>, [string, string]>();
  public FindByPhysicalAddress = jest.fn<
    Promise<LocationEntity | null>,
    [string, string, { AisleCode: string; RackCode: string; LevelCode: string; BinCode: string }]
  >();
  public Create = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public Update = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public List = jest.fn<Promise<{ Items: LocationEntity[]; TotalItems: number }>, [number, number, unknown?]>();
  public ListForTree = jest.fn<Promise<LocationEntity[]>, [string, string?]>();
}

const Location = (params: {
  Id: string;
  Code: string;
  ParentLocationId?: string | null;
  ZoneId?: string;
  AisleCode?: string | null;
  RackCode?: string | null;
  LevelCode?: string | null;
  BinCode?: string | null;
}) =>
  new LocationEntity({
    Id: params.Id,
    WarehouseId: 'warehouse-1',
    ZoneId: params.ZoneId ?? 'zone-1',
    ParentLocationId: params.ParentLocationId ?? null,
    LocationCode: params.Code,
    LocationName: params.Code,
    LocationType: 'BIN',
    LocationProfileId: 'profile-1',
    LocationStatus: LocationStatus.Active,
    CapacityQty: null,
    CapacityVolume: null,
    CapacityWeight: null,
    AisleCode: params.AisleCode ?? null,
    RackCode: params.RackCode ?? null,
    LevelCode: params.LevelCode ?? null,
    BinCode: params.BinCode ?? null,
    PalletSlot: null,
    TemperatureClass: null,
    DgCompatibilityGroup: null,
    BondedFlag: false,
    OwnerRestriction: null,
    MixSkuPolicy: null,
    MixLotPolicy: null,
    MixOwnerPolicy: null,
    PickSequence: null,
    PutawaySequence: null,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

describe('GetLocationTreeUseCase', () => {
  it('returns a nested three-level location tree without duplicate nodes', async () => {
    const locations = new FakeLocationRepository();
    locations.ListForTree.mockResolvedValue([
      Location({ Id: 'aisle-1', Code: 'AISLE-1' }),
      Location({ Id: 'rack-1', Code: 'RACK-1', ParentLocationId: 'aisle-1' }),
      Location({
        Id: 'bin-1',
        Code: 'BIN-1',
        ParentLocationId: 'rack-1',
        AisleCode: 'A01',
        RackCode: 'R01',
        LevelCode: 'L01',
        BinCode: 'B01',
      }),
    ]);

    const tree = await new GetLocationTreeUseCase(locations).Execute({ WarehouseId: 'warehouse-1' });

    expect(locations.ListForTree).toHaveBeenCalledWith('warehouse-1', undefined);
    expect(tree).toHaveLength(1);
    expect(tree[0].LocationCode).toBe('AISLE-1');
    expect(tree[0].Children).toHaveLength(1);
    expect(tree[0].Children[0].LocationCode).toBe('RACK-1');
    expect(tree[0].Children[0].Children[0].LocationCode).toBe('BIN-1');
    expect(tree[0].Children[0].Children[0]).toEqual(
      expect.objectContaining({
        AisleCode: 'A01',
        RackCode: 'R01',
        LevelCode: 'L01',
        BinCode: 'B01',
      }),
    );
  });

  it('passes warehouse and zone filters to the repository', async () => {
    const locations = new FakeLocationRepository();
    locations.ListForTree.mockResolvedValue([Location({ Id: 'bin-1', Code: 'BIN-1', ZoneId: 'zone-1' })]);

    await new GetLocationTreeUseCase(locations).Execute({ WarehouseId: 'warehouse-1', ZoneId: 'zone-1' });

    expect(locations.ListForTree).toHaveBeenCalledWith('warehouse-1', 'zone-1');
  });
});
