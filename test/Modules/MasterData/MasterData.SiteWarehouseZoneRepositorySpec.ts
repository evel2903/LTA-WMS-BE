import { ConflictException } from '@common/Exceptions/AppException';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { SiteRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SiteRepository';
import { WarehouseRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/WarehouseRepository';
import { ZoneRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ZoneRepository';
import { Repository } from 'typeorm';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });

const Site = () =>
  new SiteEntity({
    Id: 'site-1',
    SiteCode: 'SITE-HCM',
    SiteName: 'Ho Chi Minh Site',
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Warehouse = () =>
  new WarehouseEntity({
    Id: 'warehouse-1',
    SiteId: 'site-1',
    WarehouseCode: 'WH-HCM',
    WarehouseName: 'Ho Chi Minh DC',
    WarehouseTypeCode: 'DC',
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Zone = () =>
  new ZoneEntity({
    Id: 'zone-1',
    WarehouseId: 'warehouse-1',
    ZoneCode: 'PICK',
    ZoneName: 'Picking Zone',
    ZoneType: 'PICKING',
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

describe('Site/Warehouse/Zone repositories', () => {
  it('maps Site DB unique violation 23505 to ConflictException on create', async () => {
    const repository = new SiteRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<SiteOrmEntity>);

    await expect(repository.Create(Site())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps Site DB unique violation 23505 to ConflictException on update', async () => {
    const repository = new SiteRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<SiteOrmEntity>);

    await expect(repository.Update(Site())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps Warehouse DB unique violation 23505 to ConflictException on create', async () => {
    const repository = new WarehouseRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseOrmEntity>);

    await expect(repository.Create(Warehouse())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps Warehouse DB unique violation 23505 to ConflictException on update', async () => {
    const repository = new WarehouseRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseOrmEntity>);

    await expect(repository.Update(Warehouse())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps Zone DB unique violation 23505 to ConflictException on create', async () => {
    const repository = new ZoneRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<ZoneOrmEntity>);

    await expect(repository.Create(Zone())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps Zone DB unique violation 23505 to ConflictException on update', async () => {
    const repository = new ZoneRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<ZoneOrmEntity>);

    await expect(repository.Update(Zone())).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('WarehouseRepository.List WarehouseName search (IFB-16)', () => {
  function buildRepository() {
    const findAndCount = jest.fn().mockResolvedValue([[], 0]);
    const repository = new WarehouseRepository({ findAndCount } as unknown as Repository<WarehouseOrmEntity>);
    return { repository, findAndCount };
  }

  it('filters by WarehouseName using a case-insensitive partial match', async () => {
    const { repository, findAndCount } = buildRepository();

    await repository.List(0, 50, { WarehouseName: 'hcm' });

    const where = findAndCount.mock.calls[0][0].where;
    expect(where.WarehouseName.type).toBe('ilike');
    expect(where.WarehouseName.value).toBe('%hcm%');
  });

  it('does not filter by WarehouseName when omitted (no regression)', async () => {
    const { repository, findAndCount } = buildRepository();

    await repository.List(0, 50, { Status: MasterDataStatus.Active });

    const where = findAndCount.mock.calls[0][0].where;
    expect(where.WarehouseName).toBeUndefined();
    expect(where.Status).toBe(MasterDataStatus.Active);
  });

  it('combines WarehouseName with Status and SiteId filters', async () => {
    const { repository, findAndCount } = buildRepository();

    await repository.List(0, 50, {
      WarehouseName: 'DC',
      Status: MasterDataStatus.Active,
      SiteId: 'site-1',
    });

    const where = findAndCount.mock.calls[0][0].where;
    expect(where.WarehouseName.value).toBe('%DC%');
    expect(where.Status).toBe(MasterDataStatus.Active);
    expect(where.SiteId).toBe('site-1');
  });

  it('escapes LIKE wildcard characters typed by the user', async () => {
    const { repository, findAndCount } = buildRepository();

    await repository.List(0, 50, { WarehouseName: '100%_off' });

    const where = findAndCount.mock.calls[0][0].where;
    expect(where.WarehouseName.value).toBe('%100\\%\\_off%');
  });
});
