import { ConflictException } from '@common/Exceptions/AppException';
import { OwnerRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/OwnerRepository';
import { SkuRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuRepository';
import { UomRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomRepository';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });

const Owner = () =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: MasterDataStatus.Active,
    BillingPolicy: {},
    VisibilityScope: {},
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Uom = () =>
  new UomEntity({
    Id: 'uom-1',
    UomCode: 'EA',
    UomName: 'Each',
    UomType: 'Quantity',
    DecimalPrecision: 0,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Sku = () =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    ItemClass: 'DRY',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-1',
    InventoryUomId: 'uom-1',
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

describe('Owner/UOM/SKU repositories', () => {
  it('maps Owner DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new OwnerRepository(ormRepository as never);

    await expect(repository.Create(Owner())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps UOM DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new UomRepository(ormRepository as never);

    await expect(repository.Update(Uom())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps SKU DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new SkuRepository(ormRepository as never);

    await expect(repository.Create(Sku())).rejects.toBeInstanceOf(ConflictException);
  });
});
