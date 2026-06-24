import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import {
  AllocationAggregate,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickReleaseLifecycleService } from '@modules/Outbound/Application/Services/PickReleaseLifecycleService';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { OutboundOrderEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

const context: AuditContext = {
  ActorUserId: 'user-1',
  ActorRoleCodes: ['planner'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

class MemoryPickReleaseRepository implements IPickReleaseRepository {
  public aggregates: PickReleaseAggregate[] = [];

  async Create(release: PickReleaseEntity, tasks: PickTaskEntity[]): Promise<PickReleaseAggregate> {
    const aggregate = { Release: release, Tasks: tasks };
    this.aggregates.push(aggregate);
    return aggregate;
  }

  async FindById(id: string): Promise<PickReleaseAggregate | null> {
    return this.aggregates.find((item) => item.Release.Id === id) ?? null;
  }

  async FindTaskById(id: string): Promise<PickTaskEntity | null> {
    return this.aggregates.flatMap((item) => item.Tasks).find((task) => task.Id === id) ?? null;
  }

  async FindTaskByIdForUpdate(id: string): Promise<PickTaskEntity | null> {
    return this.FindTaskById(id);
  }

  async SaveTask(task: PickTaskEntity): Promise<PickTaskEntity> {
    for (const aggregate of this.aggregates) {
      const index = aggregate.Tasks.findIndex((item) => item.Id === task.Id);
      if (index >= 0) {
        aggregate.Tasks[index] = task;
        return task;
      }
    }
    return task;
  }

  async FindByIdempotencyKey(idempotencyKey: string): Promise<PickReleaseAggregate | null> {
    return this.aggregates.find((item) => item.Release.IdempotencyKey === idempotencyKey) ?? null;
  }

  async FindActiveByOutboundOrderId(outboundOrderId: string): Promise<PickReleaseAggregate | null> {
    return (
      this.aggregates.find(
        (item) =>
          item.Release.OutboundOrderId === outboundOrderId &&
          (item.Release.Status === PickReleaseStatus.Released || item.Release.Status === PickReleaseStatus.Blocked),
      ) ?? null
    );
  }

  async ListCandidates(): Promise<PickReleaseAggregate[]> {
    return this.aggregates;
  }
}

class MemoryAllocationRepository implements Partial<IAllocationRepository> {
  constructor(public aggregate: AllocationAggregate | null) {}

  async FindActiveByOutboundOrderId(): Promise<AllocationAggregate | null> {
    return this.aggregate;
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
    if (input.ReasonCode !== 'RC-V1-DISCREPANCY' || input.ObjectType !== ObjectType.PickTask) {
      throw new BusinessRuleException('Reason not applicable');
    }
    return { ReasonCodeId: 'reason-pick-release', EvidenceRequired: true, ApprovalRequired: false };
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

class MemoryTaskExecutionRepository implements ITaskExecutionRepository {
  public tasks: MobileTaskEntity[] = [];
  public scanEvents: MobileScanEventEntity[] = [];

  public async FindCandidates(filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    return this.tasks.filter((task) => {
      if (filter.WarehouseId && task.WarehouseId !== filter.WarehouseId) return false;
      if (filter.TaskStatus && task.TaskStatus !== filter.TaskStatus) return false;
      if (filter.TaskType && task.TaskType !== filter.TaskType) return false;
      return true;
    });
  }

  public async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.tasks.find((task) => task.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindBySourceDocument(
    sourceDocumentType: string,
    sourceDocumentId: string,
  ): Promise<MobileTaskEntity | null> {
    return (
      this.tasks.find(
        (task) => task.SourceDocumentType === sourceDocumentType && task.SourceDocumentId === sourceDocumentId,
      ) ?? null
    );
  }

  public async FindScanEventsByTaskId(taskId: string): Promise<MobileScanEventEntity[]> {
    return this.scanEvents.filter((scan) => scan.TaskId === taskId);
  }

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) this.tasks[index] = task;
    else this.tasks.push(task);
    return task;
  }

  public async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    this.scanEvents.push(scan);
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work({} as EntityManager);
  }
}

function orderAggregate(
  options: { status?: OutboundOrderStatus; cutoffAt?: Date | null } = {},
): OutboundOrderAggregate {
  const now = new Date('2026-06-24T00:00:00.000Z');
  const order = new OutboundOrderEntity({
    Id: 'outbound-1',
    OrderNumber: 'OB-001',
    SourceSystem: 'OMS',
    SourceReference: 'SO-001',
    BusinessReference: 'OMS:OUTBOUND:SO-001',
    ShipToReference: 'ship-to-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    CutoffAt: options.cutoffAt ?? null,
    DocumentStatus: options.status ?? OutboundOrderStatus.Validated,
    CoreFlowInstanceId: 'core-flow-1',
    ImportIdempotencyKey: 'import-1',
    ImportPayloadFingerprint: 'fingerprint-1',
    CreatedAt: now,
    UpdatedAt: now,
  });
  const lines = [1, 2].map(
    (lineNumber) =>
      new OutboundOrderLineEntity({
        Id: `order-line-${lineNumber}`,
        OutboundOrderId: order.Id,
        LineNumber: lineNumber,
        SkuId: `sku-${lineNumber}`,
        SkuCode: `SKU-${lineNumber}`,
        UomId: 'uom-1',
        UomCode: 'EA',
        OrderedQuantity: lineNumber,
        CreatedAt: now,
      }),
  );
  return { Order: order, Lines: lines };
}

function allocationAggregate(
  options: { status?: AllocationStatus; missingSource?: boolean; zeroAllocated?: boolean } = {},
): AllocationAggregate {
  const now = new Date('2026-06-24T00:00:00.000Z');
  const totalAllocated = options.status === AllocationStatus.Failed || options.zeroAllocated ? 0 : 3;
  const allocation = new AllocationEntity({
    Id: 'allocation-1',
    AllocationNumber: 'AL-001',
    OutboundOrderId: 'outbound-1',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN',
    Policy: AllocationPolicy.PartialBackorder,
    Status: options.status ?? AllocationStatus.Allocated,
    TotalOrderedQuantity: 3,
    TotalAllocatedQuantity: totalAllocated,
    TotalBackorderedQuantity: 0,
    IdempotencyKey: 'allocate-1',
    PayloadFingerprint: 'allocation-fingerprint',
    CreatedAt: now,
    UpdatedAt: now,
  });
  const lines = [1, 2].map(
    (lineNumber) =>
      new AllocationLineEntity({
        Id: `allocation-line-${lineNumber}`,
        AllocationId: allocation.Id,
        OutboundOrderLineId: `order-line-${lineNumber}`,
        LineNumber: lineNumber,
        SkuId: `sku-${lineNumber}`,
        SkuCode: `SKU-${lineNumber}`,
        UomId: 'uom-1',
        UomCode: 'EA',
        OrderedQuantity: lineNumber,
        AllocatedQuantity: options.zeroAllocated ? 0 : lineNumber,
        SourceBalanceId: options.missingSource && lineNumber === 1 ? null : `balance-${lineNumber}`,
        SourceDimensionId: options.missingSource && lineNumber === 1 ? null : `dimension-${lineNumber}`,
        SourceLocationId: options.missingSource && lineNumber === 1 ? null : `location-${lineNumber}`,
        InventoryStatusCode: 'AVAILABLE',
        LotNumber: `LOT-${lineNumber}`,
        CreatedAt: now,
        Status: AllocationStatus.Allocated,
      }),
  );
  return { Allocation: allocation, Lines: lines };
}

function harness(
  options: {
    order?: OutboundOrderAggregate;
    allocation?: AllocationAggregate | null;
    permissionAllowed?: boolean;
  } = {},
) {
  const releases = new MemoryPickReleaseRepository();
  const allocationInput = Object.prototype.hasOwnProperty.call(options, 'allocation')
    ? options.allocation
    : allocationAggregate();
  const allocations = new MemoryAllocationRepository(allocationInput ?? null);
  const orders = new MemoryOutboundOrderRepository(options.order ?? orderAggregate());
  const integrations = new MemoryIntegrationRepository();
  const coreFlows = new MemoryCoreFlowRepository();
  const audited = new MemoryAuditedTransaction();
  const taskExecution = new MemoryTaskExecutionRepository();
  const service = new PickReleaseLifecycleService(
    releases,
    allocations as unknown as IAllocationRepository,
    orders,
    coreFlows as unknown as ICoreFlowRepository,
    integrations as unknown as IIntegrationRepository,
    new MemoryReasonCatalog(),
    audited as unknown as AuditedTransaction,
    new MemoryPermissionChecker(options.permissionAllowed ?? true),
    taskExecution,
  );
  return { service, releases, integrations, coreFlows, audited, taskExecution };
}

describe('PickReleaseLifecycleService', () => {
  it('releases allocated demand into pick tasks with audit, outbox and coreflow evidence', async () => {
    const { service, integrations, coreFlows, audited, taskExecution } = harness();

    const result = await service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-1' }, context);

    expect(result.Status).toBe(PickReleaseStatus.Released);
    expect(result.TotalTaskCount).toBe(2);
    expect(result.TotalReleasedQuantity).toBe(3);
    expect(result.Tasks[0]).toMatchObject({
      SourceBalanceId: 'balance-1',
      SourceDimensionId: 'dimension-1',
      SourceLocationId: 'location-1',
      TargetReference: 'SHIP_TO:ship-to-1',
      Quantity: 1,
    });
    expect(integrations.outbox.map((item) => item.EventType)).toEqual([
      'OrderReleasedToWarehouse',
      'PickTaskReleased',
      'PickTaskReleased',
    ]);
    expect(taskExecution.tasks).toHaveLength(2);
    expect(taskExecution.tasks[0]).toMatchObject({
      TaskType: MobileTaskType.Pick,
      TaskStatus: MobileTaskStatus.Released,
      SourceDocumentType: 'PickTask',
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
    });
    expect(taskExecution.tasks[0].TaskPayload).toMatchObject({
      PickTaskId: result.Tasks[0].Id,
      SourceLocationId: 'location-1',
      Quantity: 1,
      ScanPolicy: { MandatoryScanTypes: ['Location', 'Item', 'Quantity'], AllowManualOverride: false },
    });
    expect(coreFlows.milestones[0]).toMatchObject({
      StepCode: 'ReleasedToWarehouse',
      MilestoneStatus: 'Completed',
    });
    expect(audited.entries[0]).toMatchObject({ ObjectType: ObjectType.PickTask, Action: ActionCode.Create });
  });

  it('supports batch mode and rejects batch/page sizes greater than 100', async () => {
    const { service, integrations } = harness();

    const result = await service.Release(
      {
        OutboundOrderId: 'outbound-1',
        ReleaseMode: PickReleaseMode.Batch,
        BatchSize: 1,
        IdempotencyKey: 'release-batch',
      },
      context,
    );

    expect(result.ReleaseMode).toBe(PickReleaseMode.Batch);
    expect(result.Tasks.map((task) => task.BatchNumber)).toEqual([
      `${result.ReleaseNumber}-B1`,
      `${result.ReleaseNumber}-B2`,
    ]);
    expect(integrations.outbox.map((item) => item.EventType)).toContain('WaveReleased');
    await expect(
      service.Release({ OutboundOrderId: 'outbound-1', BatchSize: 101, IdempotencyKey: 'too-large' }, context),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      service.List({ OutboundOrderId: 'outbound-1', PageSize: 101 }, context.ActorUserId),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('creates a blocked release without pick tasks when allocated source data is incomplete', async () => {
    const { service, integrations, coreFlows, audited } = harness({
      allocation: allocationAggregate({ missingSource: true }),
    });

    const result = await service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-blocked' }, context);

    expect(result.Status).toBe(PickReleaseStatus.Blocked);
    expect(result.BlockReason).toContain('missing source');
    expect(result.EvidenceRefs[0]).toContain('pick-release:block:missing-source');
    expect(result.Tasks).toHaveLength(0);
    expect(integrations.outbox[0].EventType).toBe('OrderReleaseBlocked');
    expect(coreFlows.milestones[0]).toMatchObject({ StepCode: 'ReleasedToWarehouse', MilestoneStatus: 'Blocked' });
    expect(audited.entries[0].EvidenceRefs?.[0]).toContain('pick-release:block:missing-source');
    await expect(
      service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-blocked-again' }, context),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires reason evidence when release happens after cutoff', async () => {
    const lateOrder = orderAggregate({ cutoffAt: new Date('2020-01-01T00:00:00.000Z') });
    const missingEvidence = harness({ order: lateOrder });

    await expect(
      missingEvidence.service.Release(
        {
          OutboundOrderId: 'outbound-1',
          ReasonCode: 'RC-V1-DISCREPANCY',
          IdempotencyKey: 'late-no-evidence',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const withEvidence = harness({ order: lateOrder });
    const result = await withEvidence.service.Release(
      {
        OutboundOrderId: 'outbound-1',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['cutoff-approval:1'],
        IdempotencyKey: 'late-with-evidence',
      },
      context,
    );
    expect(result.ReasonCodeId).toBe('reason-pick-release');
    expect(withEvidence.audited.entries[0].EvidenceRefs).toEqual(['cutoff-approval:1']);
  });

  it('returns duplicate releases and rejects active release conflicts', async () => {
    const { service } = harness();

    const first = await service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-dup' }, context);
    const duplicate = await service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-dup' }, context);

    expect(first.IsDuplicate).toBe(false);
    expect(duplicate.IsDuplicate).toBe(true);
    await expect(
      service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-conflict' }, context),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects failed allocation and permission denied cases', async () => {
    const noAllocation = harness({ allocation: null });
    await expect(
      noAllocation.service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-no-allocation' }, context),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const zeroAllocated = harness({ allocation: allocationAggregate({ zeroAllocated: true }) });
    await expect(
      zeroAllocated.service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-zero' }, context),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const failedAllocation = harness({ allocation: allocationAggregate({ status: AllocationStatus.Failed }) });
    await expect(
      failedAllocation.service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-failed' }, context),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const mismatched = allocationAggregate();
    mismatched.Allocation.WarehouseId = 'warehouse-2';
    const mismatchedScope = harness({ allocation: mismatched });
    await expect(
      mismatchedScope.service.Release(
        { OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-scope-mismatch' },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const denied = harness({ permissionAllowed: false });
    await expect(
      denied.service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: 'release-denied' }, context),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
  });

  it.each([OutboundOrderStatus.Held, OutboundOrderStatus.Rejected, OutboundOrderStatus.Cancelled])(
    'rejects release when outbound order status is %s',
    async (status) => {
      const setup = harness({ order: orderAggregate({ status }) });

      await expect(
        setup.service.Release({ OutboundOrderId: 'outbound-1', IdempotencyKey: `release-${status}` }, context),
      ).rejects.toBeInstanceOf(BusinessRuleException);
    },
  );
});
