import { ConflictException } from '@common/Exceptions/AppException';
import { LocationRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/LocationRepository';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { Repository } from 'typeorm';

const Location = () =>
  new LocationEntity({
    Id: 'location-1',
    WarehouseId: 'warehouse-1',
    ZoneId: 'zone-1',
    ParentLocationId: null,
    LocationCode: 'BIN-001',
    LocationName: 'Bin 001',
    LocationType: 'BIN',
    LocationProfileId: 'profile-1',
    LocationStatus: LocationStatus.Active,
    CapacityQty: null,
    CapacityVolume: null,
    CapacityWeight: null,
    AisleCode: null,
    RackCode: null,
    LevelCode: null,
    BinCode: null,
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

describe('LocationRepository', () => {
  it('maps PostgreSQL unique violation to ConflictException on create', async () => {
    const repository = new LocationRepository({
      save: jest.fn(async () => {
        throw { code: '23505' };
      }),
    } as unknown as Repository<LocationOrmEntity>);

    await expect(repository.Create(Location())).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a complete physical address in the same warehouse and zone', async () => {
    const findOne = jest.fn(async () => null);
    const repository = new LocationRepository({ findOne } as unknown as Repository<LocationOrmEntity>);

    await repository.FindByPhysicalAddress('warehouse-1', 'zone-1', {
      AisleCode: 'A01',
      RackCode: 'R01',
      LevelCode: 'L01',
      BinCode: 'B01',
    });

    expect(findOne).toHaveBeenCalledWith({
      where: {
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        AisleCode: 'A01',
        RackCode: 'R01',
        LevelCode: 'L01',
        BinCode: 'B01',
      },
    });
  });
});
