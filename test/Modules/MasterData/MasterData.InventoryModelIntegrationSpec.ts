import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { CreateInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/CreateInventoryDimensionUseCase';
import { InitializeInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/InitializeInventoryBalanceUseCase';
import { GetInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryBalanceUseCase';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import {
  MakeLocation,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
  MemoryOwnerRepository,
  MemorySkuRepository,
  MemoryUomRepository,
  MemoryWarehouseRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';

const BaseDimensionRequest = {
  OwnerId: 'owner-active',
  SkuId: 'sku-active',
  WarehouseId: 'warehouse-active',
  LocationId: 'location-active',
  InventoryStatusId: 'status-available',
  UomId: 'uom-ea',
};

describe('Inventory identity model integration fixture', () => {
  it('creates AVAILABLE status-backed dimension and balance without operations workflow', async () => {
    const dimensions = new MemoryInventoryDimensionRepository();
    const balances = new MemoryInventoryBalanceRepository();
    const createDimension = new CreateInventoryDimensionUseCase(
      dimensions,
      new MemoryOwnerRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryLocationRepository(),
      new MemoryInventoryStatusRepository(),
      new MemoryUomRepository(),
      new InventoryDimensionKeyService(),
    );
    const initializeBalance = new InitializeInventoryBalanceUseCase(balances, dimensions);
    const getBalance = new GetInventoryBalanceUseCase(balances);

    const dimension = await createDimension.Execute(BaseDimensionRequest);
    const balance = await initializeBalance.Execute({
      DimensionId: dimension.Id,
      QtyOnHand: 42,
      QtyReserved: 7,
    });
    const reloaded = await getBalance.Execute(balance.Id);

    expect(dimension.InventoryStatusId).toBe('status-available');
    expect(dimension.DimensionKeyHash).toHaveLength(64);
    expect(reloaded).toMatchObject({
      DimensionId: dimension.Id,
      QtyOnHand: 42,
      QtyReserved: 7,
      QtyAvailable: 35,
    });
  });

  it('blocks inactive and cross-warehouse locations for dimensions', async () => {
    const inactiveLocationUseCase = new CreateInventoryDimensionUseCase(
      new MemoryInventoryDimensionRepository(),
      new MemoryOwnerRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryLocationRepository([MakeLocation({ LocationStatus: LocationStatus.Inactive })]),
      new MemoryInventoryStatusRepository(),
      new MemoryUomRepository(),
      new InventoryDimensionKeyService(),
    );
    const crossWarehouseUseCase = new CreateInventoryDimensionUseCase(
      new MemoryInventoryDimensionRepository(),
      new MemoryOwnerRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryLocationRepository([MakeLocation({ WarehouseId: 'warehouse-other' })]),
      new MemoryInventoryStatusRepository(),
      new MemoryUomRepository(),
      new InventoryDimensionKeyService(),
    );

    await expect(inactiveLocationUseCase.Execute(BaseDimensionRequest)).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(crossWarehouseUseCase.Execute(BaseDimensionRequest)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('blocks duplicate balance for the same dimension', async () => {
    const dimensions = new MemoryInventoryDimensionRepository();
    const balances = new MemoryInventoryBalanceRepository();
    const createDimension = new CreateInventoryDimensionUseCase(
      dimensions,
      new MemoryOwnerRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryLocationRepository(),
      new MemoryInventoryStatusRepository(),
      new MemoryUomRepository(),
      new InventoryDimensionKeyService(),
    );
    const initializeBalance = new InitializeInventoryBalanceUseCase(balances, dimensions);
    const dimension = await createDimension.Execute(BaseDimensionRequest);

    await initializeBalance.Execute({ DimensionId: dimension.Id, QtyOnHand: 10, QtyReserved: 0 });

    await expect(
      initializeBalance.Execute({ DimensionId: dimension.Id, QtyOnHand: 10, QtyReserved: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
