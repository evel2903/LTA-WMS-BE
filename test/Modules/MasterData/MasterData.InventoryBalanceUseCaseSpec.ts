import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { InitializeInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/InitializeInventoryBalanceUseCase';
import { GetInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryBalanceUseCase';
import { ListInventoryBalancesUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryBalancesUseCase';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import {
  MakeInventoryDimension,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';

const BuildUseCase = () => {
  const balances = new MemoryInventoryBalanceRepository();
  const dimensions = new MemoryInventoryDimensionRepository();
  dimensions.dimensions.set('dimension-1', MakeInventoryDimension());

  return {
    balances,
    dimensions,
    useCase: new InitializeInventoryBalanceUseCase(balances, dimensions),
  };
};

describe('InitializeInventoryBalanceUseCase', () => {
  it('normalizes QtyAvailable when balance entity is constructed directly', () => {
    const balance = new InventoryBalanceEntity({
      Id: 'balance-direct',
      DimensionId: 'dimension-1',
      QtyOnHand: 10,
      QtyReserved: 4,
      QtyAvailable: 99,
      CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
      UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(balance.QtyAvailable).toBe(6);
  });

  it('creates one balance per dimension and calculates available quantity', async () => {
    const { useCase } = BuildUseCase();

    const balance = await useCase.Execute({
      DimensionId: 'dimension-1',
      QtyOnHand: 100,
      QtyReserved: 12.5,
    });

    expect(balance.DimensionId).toBe('dimension-1');
    expect(balance.QtyOnHand).toBe(100);
    expect(balance.QtyReserved).toBe(12.5);
    expect(balance.QtyAvailable).toBe(87.5);
  });

  it('rejects duplicate balance initialization for the same dimension', async () => {
    const { useCase } = BuildUseCase();

    await useCase.Execute({ DimensionId: 'dimension-1', QtyOnHand: 10, QtyReserved: 0 });

    await expect(useCase.Execute({ DimensionId: 'dimension-1', QtyOnHand: 10, QtyReserved: 0 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it.each([
    ['negative on hand', { QtyOnHand: -1, QtyReserved: 0 }],
    ['negative reserved', { QtyOnHand: 10, QtyReserved: -1 }],
    ['reserved greater than on hand', { QtyOnHand: 10, QtyReserved: 11 }],
  ])('rejects %s', async (_case, quantity) => {
    const { useCase } = BuildUseCase();

    await expect(useCase.Execute({ DimensionId: 'dimension-1', ...quantity })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('rejects missing dimension with a controlled not found error', async () => {
    const { useCase } = BuildUseCase();

    await expect(
      useCase.Execute({ DimensionId: 'dimension-missing', QtyOnHand: 10, QtyReserved: 0 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('supports get and list use cases for initialized balances', async () => {
    const { useCase, balances } = BuildUseCase();
    const created = await useCase.Execute({ DimensionId: 'dimension-1', QtyOnHand: 10, QtyReserved: 4 });

    const getUseCase = new GetInventoryBalanceUseCase(balances);
    const listUseCase = new ListInventoryBalancesUseCase(balances);

    await expect(getUseCase.Execute(created.Id)).resolves.toMatchObject({ Id: created.Id, QtyAvailable: 6 });
    await expect(listUseCase.Execute(0, 10, { DimensionId: 'dimension-1' })).resolves.toMatchObject({
      TotalItems: 1,
      Items: [expect.objectContaining({ Id: created.Id })],
    });
  });
});
