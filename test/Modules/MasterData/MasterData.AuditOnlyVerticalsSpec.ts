import { EntityManager } from 'typeorm';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@modules/AccessControl/Test/AccessControlTestDoubles';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { UpdateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/UpdateItemCoverageUseCase';
import { CreateInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/CreateInventoryDimensionUseCase';
import { InitializeInventoryBalanceUseCase } from '@modules/MasterData/Application/UseCases/InitializeInventoryBalanceUseCase';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  MakeInventoryDimension,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
  MemoryOwnerRepository,
  MemorySkuRepository,
  MemoryUomRepository,
  MemoryWarehouseRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';

/**
 * Always-run (no-DB) unit spec proving the four MasterData AUDIT-ONLY use cases build the
 * correct audit entry. Each use case is constructed with a StubAuditedTransaction cast as
 * `unknown as AuditedTransaction`; the stub captures the entry the use case emits into
 * `stub.Entries`. These verticals carry no ownership-policy / reason-code handling — they
 * just write a plain in-transaction audit record.
 */
const ctx: AuditContext = {
  ActorUserId: 'u-md',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-md',
  RequestId: 'req-md',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const Now = new Date('2026-01-01T00:00:00.000Z');

const Coverage = (overrides: Partial<ConstructorParameters<typeof ItemCoverageEntity>[0]> = {}) =>
  new ItemCoverageEntity({
    Id: 'coverage-1',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    OwnerId: 'owner-active',
    MinQty: 10,
    MaxQty: 100,
    StandardQty: 24,
    MultipleQty: 6,
    LeadTimeDays: 2,
    DefaultReceiveWarehouseId: null,
    DefaultShipWarehouseId: null,
    ReorderPolicy: { Method: 'MinMax' },
    StopReceiving: false,
    StopShipping: false,
    Status: MasterDataStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

/** Minimal in-memory ItemCoverage repo (InventoryTestDoubles ships none). */
class MemoryItemCoverageRepository implements IItemCoverageRepository {
  public readonly coverages = new Map<string, ItemCoverageEntity>();

  constructor(seed: ItemCoverageEntity[] = []) {
    for (const coverage of seed) this.coverages.set(coverage.Id, coverage);
  }

  public async FindById(id: string): Promise<ItemCoverageEntity | null> {
    return this.coverages.get(id) ?? null;
  }

  public async FindBySkuWarehouseOwner(): Promise<ItemCoverageEntity | null> {
    return null;
  }

  public async Create(itemCoverage: ItemCoverageEntity, _manager?: EntityManager): Promise<ItemCoverageEntity> {
    void _manager;
    this.coverages.set(itemCoverage.Id, itemCoverage);
    return itemCoverage;
  }

  public async Update(itemCoverage: ItemCoverageEntity, _manager?: EntityManager): Promise<ItemCoverageEntity> {
    void _manager;
    this.coverages.set(itemCoverage.Id, itemCoverage);
    return itemCoverage;
  }

  public async List(): Promise<{ Items: ItemCoverageEntity[]; TotalItems: number }> {
    const items = [...this.coverages.values()];
    return { Items: items, TotalItems: items.length };
  }
}

describe('MasterData audit-only verticals build the correct audit entry', () => {
  it('CreateItemCoverageUseCase writes a Create ItemCoverage entry with warehouse + owner scope', async () => {
    const stub = new StubAuditedTransaction();
    const useCase = new CreateItemCoverageUseCase(
      new MemoryItemCoverageRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryOwnerRepository(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute(
      {
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        OwnerId: 'owner-active',
        MinQty: 10,
        MaxQty: 100,
        Status: MasterDataStatus.Active,
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.ItemCoverage,
        WarehouseId: 'warehouse-active',
        OwnerId: 'owner-active',
        ActorUserId: 'u-md',
      }),
    );
    expect(stub.Entries[0].AfterJson).toEqual(
      expect.objectContaining({ SkuId: 'sku-active', WarehouseId: 'warehouse-active', OwnerId: 'owner-active' }),
    );
  });

  it('UpdateItemCoverageUseCase writes an Update ItemCoverage entry with before + after image', async () => {
    const stub = new StubAuditedTransaction();
    const existing = Coverage({ StandardQty: 24 });
    const useCase = new UpdateItemCoverageUseCase(
      new MemoryItemCoverageRepository([existing]),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryOwnerRepository(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute({ Id: 'coverage-1', StandardQty: 48 }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.ItemCoverage }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual(expect.objectContaining({ StandardQty: 24 }));
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ StandardQty: 48 }));
  });

  it('CreateInventoryDimensionUseCase writes a Create InventoryStatus entry keyed by the dimension hash', async () => {
    const stub = new StubAuditedTransaction();
    const keyService = new InventoryDimensionKeyService();
    const request = {
      OwnerId: 'owner-active',
      SkuId: 'sku-active',
      WarehouseId: 'warehouse-active',
      LocationId: 'location-active',
      InventoryStatusId: 'status-available',
      UomId: 'uom-ea',
    };
    const expectedHash = keyService.BuildHash(request);

    const useCase = new CreateInventoryDimensionUseCase(
      new MemoryInventoryDimensionRepository(),
      new MemoryOwnerRepository(),
      new MemorySkuRepository(),
      new MemoryWarehouseRepository(),
      new MemoryLocationRepository(),
      new MemoryInventoryStatusRepository(),
      new MemoryUomRepository(),
      keyService,
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute(request, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        // Deliberate ObjectType reuse: inventory dimensions audit under InventoryStatus.
        ObjectType: ObjectType.InventoryStatus,
        ObjectCode: expectedHash,
        WarehouseId: 'warehouse-active',
        OwnerId: 'owner-active',
      }),
    );
  });

  it('InitializeInventoryBalanceUseCase writes a Create InventoryStatus entry referencing the dimension', async () => {
    const stub = new StubAuditedTransaction();
    const dimensions = new MemoryInventoryDimensionRepository();
    dimensions.dimensions.set('dimension-1', MakeInventoryDimension({ Id: 'dimension-1' }));

    const useCase = new InitializeInventoryBalanceUseCase(
      new MemoryInventoryBalanceRepository(),
      dimensions,
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute({ DimensionId: 'dimension-1', QtyOnHand: 10, QtyReserved: 2 }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.InventoryStatus,
        ReferenceType: 'InventoryDimension',
        ReferenceId: 'dimension-1',
      }),
    );
  });
});
