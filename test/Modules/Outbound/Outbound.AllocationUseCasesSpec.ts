import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import {
  AllocationAggregate,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import {
  AllocationInventoryCandidate,
  AllocationInventoryCandidateFilter,
  IAllocationInventoryRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationInventoryRepository';
import {
  OutboundOrderAggregate,
  IOutboundOrderRepository,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { AllocationLifecycleService } from '@modules/Outbound/Application/Services/AllocationLifecycleService';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { OutboundOrderEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';

const context: AuditContext = {
  ActorUserId: 'user-1',
  ActorRoleCodes: ['planner'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'vitest',
};

class MemoryAllocationRepository implements IAllocationRepository {
  public aggregates: AllocationAggregate[] = [];

  async Create(allocation: AllocationEntity, lines: AllocationLineEntity[]): Promise<AllocationAggregate> {
    const aggregate = { Allocation: allocation, Lines: lines };
    this.aggregates.push(aggregate);
    return aggregate;
  }

  async FindById(id: string): Promise<AllocationAggregate | null> {
    return this.aggregates.find((item) => item.Allocation.Id === id) ?? null;
  }

  async FindByIdempotencyKey(idempotencyKey: string): Promise<AllocationAggregate | null> {
    return this.aggregates.find((item) => item.Allocation.IdempotencyKey === idempotencyKey) ?? null;
  }

  async FindActiveByOutboundOrderId(outboundOrderId: string): Promise<AllocationAggregate | null> {
    return (
      this.aggregates.find(
        (item) =>
          item.Allocation.OutboundOrderId === outboundOrderId && item.Allocation.Status !== AllocationStatus.Failed,
      ) ?? null
    );
  }

  async ListCandidates(): Promise<AllocationAggregate[]> {
    return this.aggregates;
  }
}

class MemoryAllocationInventoryRepository implements IAllocationInventoryRepository {
  constructor(public candidates: AllocationInventoryCandidate[]) {}

  async ListCandidates(filter: AllocationInventoryCandidateFilter): Promise<AllocationInventoryCandidate[]> {
    // Mirrors AllocationInventoryRepository's real SQL: ORDER BY expiry_date ASC NULLS LAST,
    // production_date ASC NULLS LAST, created_at ASC (IDC-05 regression coverage needs this
    // to actually exercise FEFO ordering across multiple candidates, not just insertion order).
    const nullsLast = (value: Date | null) => value?.getTime() ?? Number.POSITIVE_INFINITY;
    return this.candidates
      .filter(
        (item) =>
          item.Dimension.WarehouseId === filter.WarehouseId &&
          item.Dimension.OwnerId === filter.OwnerId &&
          item.Dimension.SkuId === filter.SkuId &&
          item.Dimension.UomId === filter.UomId &&
          item.InventoryStatusCode === 'AVAILABLE' &&
          item.Balance.QtyAvailable > 0 &&
          (!filter.RequestedLotNumber || item.Dimension.LotNumber === filter.RequestedLotNumber) &&
          (!filter.RequestedSerialNumber || item.Dimension.SerialNumber === filter.RequestedSerialNumber),
      )
      .sort(
        (left, right) =>
          nullsLast(left.Dimension.ExpiryDate) - nullsLast(right.Dimension.ExpiryDate) ||
          nullsLast(left.Dimension.ProductionDate) - nullsLast(right.Dimension.ProductionDate) ||
          left.Balance.CreatedAt.getTime() - right.Balance.CreatedAt.getTime(),
      );
  }
}

class MemoryOutboundOrderRepository implements IOutboundOrderRepository {
  constructor(public aggregate: OutboundOrderAggregate) {}

  async Create(): Promise<OutboundOrderAggregate> {
    return this.aggregate;
  }

  async UpdateAggregate(): Promise<OutboundOrderAggregate> {
    return this.aggregate;
  }

  async UpdateOrder(order: OutboundOrderEntity): Promise<OutboundOrderEntity> {
    this.aggregate = { ...this.aggregate, Order: order };
    return order;
  }

  async FindById(id: string): Promise<OutboundOrderAggregate | null> {
    return this.aggregate.Order.Id === id ? this.aggregate : null;
  }

  async FindByIdForUpdate(id: string): Promise<OutboundOrderAggregate | null> {
    return this.FindById(id);
  }

  async FindByBusinessKey(): Promise<OutboundOrderAggregate | null> {
    return null;
  }

  async FindByIdempotencyKey(): Promise<OutboundOrderAggregate | null> {
    return null;
  }

  async ListCandidates(): Promise<OutboundOrderAggregate[]> {
    return [this.aggregate];
  }
}

class MemoryInventoryBalanceRepository implements IInventoryBalanceRepository {
  constructor(public balances: InventoryBalanceEntity[]) {}

  async FindById(id: string): Promise<InventoryBalanceEntity | null> {
    return this.balances.find((item) => item.Id === id) ?? null;
  }

  async FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    return this.balances.find((item) => item.DimensionId === dimensionId) ?? null;
  }

  async FindByDimensionIdForUpdate(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    return this.FindByDimensionId(dimensionId);
  }

  async FindOrCreateByDimensionIdForUpdate(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    this.balances.push(balance);
    return balance;
  }

  async Create(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    this.balances.push(balance);
    return balance;
  }

  async Update(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    const index = this.balances.findIndex((item) => item.Id === balance.Id);
    this.balances[index] = balance;
    return balance;
  }

  async List(): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }> {
    return { Items: this.balances, TotalItems: this.balances.length };
  }
}

class MemoryIntegrationRepository implements Partial<IIntegrationRepository> {
  public outbox: OutboxMessageEntity[] = [];

  async CreateOutboxMessage(message: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.outbox.push(message);
    return message;
  }
}

class MemoryCoreFlowRepository implements Partial<ICoreFlowRepository> {
  public milestones: WorkflowMilestoneEntity[] = [];

  async CreateMilestone(milestone: WorkflowMilestoneEntity): Promise<WorkflowMilestoneEntity> {
    this.milestones.push(milestone);
    return milestone;
  }
}

class MemoryReasonCatalog implements IReasonCodeCatalog {
  async ValidateReason(input: { ReasonCode: string; Action: ActionCode; ObjectType: ObjectType }) {
    if (input.ReasonCode !== 'RC-V1-DISCREPANCY' || input.ObjectType !== ObjectType.Allocation) {
      throw new BusinessRuleException('Reason not applicable');
    }
    return { ReasonCodeId: 'reason-allocation-shortage', EvidenceRequired: true, ApprovalRequired: false };
  }
}

class MemoryAuditedTransaction implements Partial<AuditedTransaction> {
  public entries: AuditEntry[] = [];

  async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(...(Array.isArray(entry) ? entry : [entry]));
    return result;
  }
}

class MemoryPermissionChecker implements IPermissionChecker {
  constructor(private readonly allowed = true) {}

  async Check(): Promise<PermissionDecision> {
    return { Allowed: this.allowed, Reason: this.allowed ? undefined : 'PERMISSION_DENIED' };
  }
}

function orderAggregate(
  status: OutboundOrderStatus = OutboundOrderStatus.Validated,
  lineOverrides: { RequestedLotNumber?: string | null; RequestedSerialNumber?: string | null } = {},
): OutboundOrderAggregate {
  const now = new Date('2026-06-24T00:00:00.000Z');
  const order = new OutboundOrderEntity({
    Id: 'outbound-1',
    OrderNumber: 'OB-001',
    SourceSystem: 'OMS',
    SourceReference: 'SO-001',
    BusinessReference: 'OMS:OUTBOUND:SO-001',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    DocumentStatus: status,
    CoreFlowInstanceId: 'core-flow-1',
    ImportIdempotencyKey: 'import-1',
    ImportPayloadFingerprint: 'fingerprint-1',
    CreatedAt: now,
    UpdatedAt: now,
  });
  const line = new OutboundOrderLineEntity({
    Id: 'line-1',
    OutboundOrderId: order.Id,
    LineNumber: 1,
    SkuId: 'sku-1',
    SkuCode: 'SKU-1',
    UomId: 'uom-1',
    UomCode: 'EA',
    OrderedQuantity: 5,
    RequestedLotNumber: lineOverrides.RequestedLotNumber,
    RequestedSerialNumber: lineOverrides.RequestedSerialNumber,
    CreatedAt: now,
  });
  return { Order: order, Lines: [line] };
}

function balance(id: string, dimensionId: string, qtyOnHand: number, qtyReserved = 0) {
  return new InventoryBalanceEntity({
    Id: id,
    DimensionId: dimensionId,
    QtyOnHand: qtyOnHand,
    QtyReserved: qtyReserved,
    CreatedAt: new Date('2026-06-24T00:00:00.000Z'),
    UpdatedAt: new Date('2026-06-24T00:00:00.000Z'),
  });
}

function dimension(
  id: string,
  ownerId = 'owner-1',
  overrides: { LotNumber?: string | null; SerialNumber?: string | null } = {},
) {
  return new InventoryDimensionEntity({
    Id: id,
    OwnerId: ownerId,
    SkuId: 'sku-1',
    WarehouseId: 'warehouse-1',
    LocationId: 'location-1',
    InventoryStatusId: 'status-available',
    DimensionKeyHash: `hash-${id}`,
    UomId: 'uom-1',
    LotNumber: overrides.LotNumber ?? 'LOT-1',
    SerialNumber: overrides.SerialNumber ?? null,
    ExpiryDate: new Date('2026-12-31T00:00:00.000Z'),
    CreatedAt: new Date('2026-06-24T00:00:00.000Z'),
    UpdatedAt: new Date('2026-06-24T00:00:00.000Z'),
  });
}

function candidate(input: { balance: InventoryBalanceEntity; dimension: InventoryDimensionEntity; status?: string }) {
  return {
    Balance: input.balance,
    Dimension: input.dimension,
    InventoryStatusCode: input.status ?? 'AVAILABLE',
  };
}

function harness(
  options: {
    status?: OutboundOrderStatus;
    candidates?: AllocationInventoryCandidate[];
    balances?: InventoryBalanceEntity[];
    permissionAllowed?: boolean;
    lineOverrides?: { RequestedLotNumber?: string | null; RequestedSerialNumber?: string | null };
  } = {},
) {
  const orders = new MemoryOutboundOrderRepository(orderAggregate(options.status, options.lineOverrides));
  const allocations = new MemoryAllocationRepository();
  const inventory = new MemoryAllocationInventoryRepository(options.candidates ?? []);
  const balances = new MemoryInventoryBalanceRepository(options.balances ?? []);
  const integrations = new MemoryIntegrationRepository();
  const coreFlows = new MemoryCoreFlowRepository();
  const audited = new MemoryAuditedTransaction();
  const service = new AllocationLifecycleService(
    allocations,
    inventory,
    orders,
    balances,
    coreFlows as unknown as ICoreFlowRepository,
    integrations as unknown as IIntegrationRepository,
    new MemoryReasonCatalog(),
    audited as unknown as AuditedTransaction,
    new MemoryPermissionChecker(options.permissionAllowed ?? true),
  );
  return { service, allocations, balances, integrations, coreFlows, audited };
}

describe('AllocationLifecycleService', () => {
  it('reserves eligible AVAILABLE inventory and writes audit/outbox/coreflow evidence', async () => {
    const source = balance('balance-1', 'dimension-1', 10, 2);
    const sourceDimension = dimension('dimension-1');
    const { service, balances, integrations, coreFlows, audited } = harness({
      candidates: [candidate({ balance: source, dimension: sourceDimension })],
      balances: [source],
    });

    const result = await service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-1' }, context);

    expect(result.Status).toBe(AllocationStatus.Allocated);
    expect(result.TotalAllocatedQuantity).toBe(5);
    expect(result.Lines[0]).toMatchObject({
      SourceBalanceId: 'balance-1',
      InventoryStatusCode: 'AVAILABLE',
      AllocatedQuantity: 5,
    });
    expect(balances.balances[0].QtyReserved).toBe(7);
    expect(integrations.outbox[0].EventType).toBe('AllocationCreated');
    expect(coreFlows.milestones[0].StepCode).toBe('AllocationCompleted');
    expect(audited.entries[0]).toMatchObject({ ObjectType: ObjectType.Allocation, Action: ActionCode.Create });
  });

  it('records partial allocation and backorder with reason evidence', async () => {
    const source = balance('balance-1', 'dimension-1', 3, 0);
    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });

    const result = await service.Allocate(
      {
        OutboundOrderId: 'outbound-1',
        IdempotencyKey: 'allocate-partial',
        Policy: AllocationPolicy.PartialBackorder,
        EvidenceRefs: ['shortage:1'],
      },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.PartiallyAllocated);
    expect(result.TotalAllocatedQuantity).toBe(3);
    expect(result.TotalBackorderedQuantity).toBe(2);
    expect(result.ReasonCode).toBe('RC-V1-DISCREPANCY');
    expect(balances.balances[0].QtyReserved).toBe(3);
    expect(integrations.outbox[0].EventType).toBe('AllocationCreated');
  });

  it('does not reserve anything when FullOnly policy has shortage', async () => {
    const source = balance('balance-1', 'dimension-1', 3, 0);
    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });

    const result = await service.Allocate(
      {
        OutboundOrderId: 'outbound-1',
        IdempotencyKey: 'allocate-full-only',
        Policy: AllocationPolicy.FullOnly,
        EvidenceRefs: ['shortage:full'],
      },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Failed);
    expect(result.TotalAllocatedQuantity).toBe(0);
    expect(result.TotalBackorderedQuantity).toBe(5);
    expect(balances.balances[0].QtyReserved).toBe(0);
    expect(integrations.outbox[0].EventType).toBe('AllocationFailed');
  });

  it('fails without reservation when only non-eligible stock is available', async () => {
    const source = balance('balance-hold', 'dimension-hold', 5, 0);
    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-hold'), status: 'HOLD' })],
      balances: [source],
    });

    const result = await service.Allocate(
      {
        OutboundOrderId: 'outbound-1',
        IdempotencyKey: 'allocate-hold',
        EvidenceRefs: ['blocked-status:hold'],
      },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Failed);
    expect(result.TotalAllocatedQuantity).toBe(0);
    expect(balances.balances[0].QtyReserved).toBe(0);
    expect(integrations.outbox[0].EventType).toBe('AllocationFailed');
  });

  it('does not reserve stock from another owner', async () => {
    const source = balance('balance-other-owner', 'dimension-other-owner', 5, 0);
    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-other-owner', 'owner-2') })],
      balances: [source],
    });

    const result = await service.Allocate(
      {
        OutboundOrderId: 'outbound-1',
        IdempotencyKey: 'allocate-owner-segregation',
        EvidenceRefs: ['owner-scope:other'],
      },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Failed);
    expect(result.TotalAllocatedQuantity).toBe(0);
    expect(balances.balances[0].QtyReserved).toBe(0);
    expect(integrations.outbox[0].EventType).toBe('AllocationFailed');
  });

  it('rejects shortage decisions when required evidence is missing', async () => {
    const source = balance('balance-1', 'dimension-1', 3, 0);
    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });

    await expect(
      service.Allocate(
        {
          OutboundOrderId: 'outbound-1',
          IdempotencyKey: 'allocate-missing-evidence',
          Policy: AllocationPolicy.PartialBackorder,
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(balances.balances[0].QtyReserved).toBe(0);
    expect(integrations.outbox).toHaveLength(0);
  });

  it('returns duplicate allocation for same idempotency payload without double-reserving', async () => {
    const source = balance('balance-1', 'dimension-1', 10, 0);
    const { service, balances } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });

    const first = await service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-dup' }, context);
    const second = await service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-dup' }, context);

    expect(first.IsDuplicate).toBe(false);
    expect(second.IsDuplicate).toBe(true);
    expect(balances.balances[0].QtyReserved).toBe(5);
  });

  it('rejects a second active allocation for the same order with a different idempotency key', async () => {
    const source = balance('balance-1', 'dimension-1', 10, 0);
    const { service, balances } = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });

    await service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-active-1' }, context);

    await expect(
      service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-active-2' }, context),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(balances.balances[0].QtyReserved).toBe(5);
  });

  it('rejects allocation listing page sizes greater than 100', async () => {
    const { service } = harness();

    await expect(
      service.List({ OutboundOrderId: 'outbound-1', PageSize: 101 }, context.ActorUserId),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects idempotency collision and permission denied cases', async () => {
    const source = balance('balance-1', 'dimension-1', 10, 0);
    const setup = harness({
      candidates: [candidate({ balance: source, dimension: dimension('dimension-1') })],
      balances: [source],
    });
    await setup.service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-collision' }, context);

    await expect(
      setup.service.Allocate(
        {
          OutboundOrderId: 'outbound-1',
          IdempotencyKey: 'allocate-collision',
          Policy: AllocationPolicy.FullOnly,
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const denied = harness({ permissionAllowed: false });
    await expect(
      denied.service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-denied' }, context),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
  });

  it('allocates the exact requested serial, not the FEFO-preferred dimension (IDC-05)', async () => {
    const fefoBalance = balance('balance-fefo', 'dimension-fefo', 10, 0);
    const fefoDimension = new InventoryDimensionEntity({
      Id: 'dimension-fefo',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      WarehouseId: 'warehouse-1',
      LocationId: 'location-1',
      InventoryStatusId: 'status-available',
      DimensionKeyHash: 'hash-dimension-fefo',
      UomId: 'uom-1',
      LotNumber: 'LOT-OLD',
      ExpiryDate: new Date('2026-08-01T00:00:00.000Z'),
      CreatedAt: new Date('2026-06-24T00:00:00.000Z'),
      UpdatedAt: new Date('2026-06-24T00:00:00.000Z'),
    });
    const requestedBalance = balance('balance-requested', 'dimension-requested', 5, 0);
    const requestedDimension = dimension('dimension-requested', 'owner-1', { SerialNumber: 'SN-1' });

    const { service, balances } = harness({
      candidates: [
        candidate({ balance: fefoBalance, dimension: fefoDimension }),
        candidate({ balance: requestedBalance, dimension: requestedDimension }),
      ],
      balances: [fefoBalance, requestedBalance],
      lineOverrides: { RequestedSerialNumber: 'SN-1' },
    });

    const result = await service.Allocate(
      { OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-serial' },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Allocated);
    expect(result.Lines[0]).toMatchObject({ SourceDimensionId: 'dimension-requested', AllocatedQuantity: 5 });
    expect(balances.balances.find((item) => item.Id === 'balance-requested')?.QtyReserved).toBe(5);
    expect(balances.balances.find((item) => item.Id === 'balance-fefo')?.QtyReserved).toBe(0);
  });

  it('allocates the exact requested lot, not the FEFO-preferred dimension (IDC-05)', async () => {
    const fefoBalance = balance('balance-fefo-lot', 'dimension-fefo-lot', 10, 0);
    const fefoDimension = dimension('dimension-fefo-lot', 'owner-1', { LotNumber: 'LOT-OLD' });
    const requestedBalance = balance('balance-requested-lot', 'dimension-requested-lot', 5, 0);
    const requestedDimension = new InventoryDimensionEntity({
      Id: 'dimension-requested-lot',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      WarehouseId: 'warehouse-1',
      LocationId: 'location-1',
      InventoryStatusId: 'status-available',
      DimensionKeyHash: 'hash-dimension-requested-lot',
      UomId: 'uom-1',
      LotNumber: 'LOT-REQUESTED',
      ExpiryDate: new Date('2026-12-31T00:00:00.000Z'),
      CreatedAt: new Date('2026-06-24T00:00:00.000Z'),
      UpdatedAt: new Date('2026-06-24T00:00:00.000Z'),
    });

    const { service, balances } = harness({
      candidates: [
        candidate({ balance: fefoBalance, dimension: fefoDimension }),
        candidate({ balance: requestedBalance, dimension: requestedDimension }),
      ],
      balances: [fefoBalance, requestedBalance],
      lineOverrides: { RequestedLotNumber: 'LOT-REQUESTED' },
    });

    const result = await service.Allocate({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-lot' }, context);

    expect(result.Status).toBe(AllocationStatus.Allocated);
    expect(result.Lines[0]).toMatchObject({ SourceDimensionId: 'dimension-requested-lot', AllocatedQuantity: 5 });
    expect(balances.balances.find((item) => item.Id === 'balance-requested-lot')?.QtyReserved).toBe(5);
    expect(balances.balances.find((item) => item.Id === 'balance-fefo-lot')?.QtyReserved).toBe(0);
  });

  it('keeps plain FEFO-by-expiry-date behavior across multiple lots when no lot/serial is requested (IDC-05 regression)', async () => {
    const olderBalance = balance('balance-older-lot', 'dimension-older-lot', 5, 0);
    const olderDimension = new InventoryDimensionEntity({
      Id: 'dimension-older-lot',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      WarehouseId: 'warehouse-1',
      LocationId: 'location-1',
      InventoryStatusId: 'status-available',
      DimensionKeyHash: 'hash-dimension-older-lot',
      UomId: 'uom-1',
      LotNumber: 'LOT-EARLY-EXPIRY',
      ExpiryDate: new Date('2026-08-01T00:00:00.000Z'),
      CreatedAt: new Date('2026-06-24T00:00:00.000Z'),
      UpdatedAt: new Date('2026-06-24T00:00:00.000Z'),
    });
    const newerBalance = balance('balance-newer-lot', 'dimension-newer-lot', 5, 0);
    const newerDimension = dimension('dimension-newer-lot', 'owner-1', { LotNumber: 'LOT-LATE-EXPIRY' });

    const { service, balances } = harness({
      candidates: [
        candidate({ balance: newerBalance, dimension: newerDimension }),
        candidate({ balance: olderBalance, dimension: olderDimension }),
      ],
      balances: [olderBalance, newerBalance],
    });

    const result = await service.Allocate(
      { OutboundOrderId: 'outbound-1', IdempotencyKey: 'allocate-fefo-regression' },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Allocated);
    expect(result.Lines[0]).toMatchObject({ SourceDimensionId: 'dimension-older-lot', AllocatedQuantity: 5 });
    expect(balances.balances.find((item) => item.Id === 'balance-older-lot')?.QtyReserved).toBe(5);
    expect(balances.balances.find((item) => item.Id === 'balance-newer-lot')?.QtyReserved).toBe(0);
  });

  it('backorders with a clear shortage reason when the requested serial is not in eligible inventory, without falling back to another dimension (IDC-05)', async () => {
    const otherBalance = balance('balance-other-serial', 'dimension-other-serial', 10, 0);
    const otherDimension = dimension('dimension-other-serial', 'owner-1', { SerialNumber: 'SN-DIFFERENT' });

    const { service, balances, integrations } = harness({
      candidates: [candidate({ balance: otherBalance, dimension: otherDimension })],
      balances: [otherBalance],
      lineOverrides: { RequestedSerialNumber: 'SN-MISSING' },
    });

    const result = await service.Allocate(
      {
        OutboundOrderId: 'outbound-1',
        IdempotencyKey: 'allocate-serial-shortage',
        Policy: AllocationPolicy.PartialBackorder,
        EvidenceRefs: ['shortage:requested-serial-missing'],
      },
      context,
    );

    expect(result.Status).toBe(AllocationStatus.Failed);
    expect(result.TotalAllocatedQuantity).toBe(0);
    expect(result.TotalBackorderedQuantity).toBe(5);
    expect(result.ShortageReason).toBeTruthy();
    expect(balances.balances.find((item) => item.Id === 'balance-other-serial')?.QtyReserved).toBe(0);
    expect(integrations.outbox[0].EventType).toBe('AllocationFailed');
  });
});
