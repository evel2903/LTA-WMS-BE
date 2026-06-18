import { ConflictException } from '@common/Exceptions/AppException';
import { InventoryBalanceRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/InventoryBalanceRepository';
import { InventoryDimensionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/InventoryDimensionRepository';
import { MakeInventoryBalance, MakeInventoryDimension } from '@test/Modules/MasterData/InventoryTestDoubles';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });

describe('Inventory repositories', () => {
  it('maps InventoryDimension DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { findOne: jest.fn(), save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new InventoryDimensionRepository(ormRepository as never);

    await expect(repository.Create(MakeInventoryDimension())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps InventoryBalance DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { findOne: jest.fn(), save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new InventoryBalanceRepository(ormRepository as never);

    await expect(repository.Create(MakeInventoryBalance())).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not persist an inconsistent InventoryBalance QtyAvailable value', async () => {
    const ormRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
    };
    const repository = new InventoryBalanceRepository(ormRepository as never);

    await repository.Create(MakeInventoryBalance({ QtyOnHand: 10, QtyReserved: 4, QtyAvailable: 99 }));

    expect(ormRepository.save).toHaveBeenCalledWith(expect.objectContaining({ QtyAvailable: 6 }));
  });
});
