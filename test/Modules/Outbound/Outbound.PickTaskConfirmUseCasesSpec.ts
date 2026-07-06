import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { validateSync } from 'class-validator';
import { EntityManager } from 'typeorm';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { InventoryControlResultDto } from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { PickTaskScanEvidenceDto } from '@modules/Outbound/Application/DTOs/PickTaskConfirmDto';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickTaskConfirmationService } from '@modules/Outbound/Application/Services/PickTaskConfirmationService';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import {
  MobilePickTaskController,
  PickTaskController,
} from '@modules/Outbound/Presentation/Controllers/PickTaskController';
import { ConfirmPickTaskRequest } from '@modules/Outbound/Presentation/Requests/ConfirmPickTaskRequest';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

const now = new Date('2026-06-24T00:00:00.000Z');
const context: AuditContext = {
  ActorUserId: 'picker-1',
  ActorRoleCodes: ['picker'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

function makePickTask(overrides: Partial<PickTaskEntity> = {}): PickTaskEntity {
  return Object.assign(
    new PickTaskEntity({
      Id: 'pick-task-1',
      PickReleaseId: 'release-1',
      OutboundOrderId: 'outbound-1',
      AllocationId: 'allocation-1',
      AllocationLineId: 'allocation-line-1',
      OutboundOrderLineId: 'order-line-1',
      TaskNumber: 'PT-001',
      Status: PickTaskStatus.Released,
      Sequence: 1,
      SourceBalanceId: 'balance-source',
      SourceDimensionId: 'dimension-source',
      SourceLocationId: 'loc-source',
      TargetReference: 'SHIP_TO:customer-1',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: 5,
      InventoryStatusCode: 'AVAILABLE',
      LotNumber: 'LOT-1',
      CreatedAt: now,
    }),
    overrides,
  );
}

function makeMobileTask(overrides: Partial<MobileTaskEntity> = {}): MobileTaskEntity {
  return Object.assign(
    new MobileTaskEntity({
      Id: 'mobile-task-1',
      TaskCode: 'MT-PT-001',
      TaskType: MobileTaskType.Pick,
      TaskStatus: MobileTaskStatus.Claimed,
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WH-1',
      OwnerId: 'owner-1',
      OwnerCode: 'OWN',
      SourceDocumentType: 'PickTask',
      SourceDocumentId: 'pick-task-1',
      SourceDocumentCode: 'PT-001',
      Priority: 50,
      AssignedUserId: 'picker-1',
      ClaimedAt: now,
      TaskPayload: { PickTaskId: 'pick-task-1' },
      CreatedAt: now,
      UpdatedAt: now,
    }),
    overrides,
  );
}

function makeScan(input: {
  id: string;
  scanType: MobileScanType;
  rawValue: string;
  normalizedValue?: string;
  resolvedObjectId?: string | null;
  parsed?: Record<string, unknown>;
  result?: MobileScanResult;
  actorUserId?: string;
  createdAt?: Date;
}): MobileScanEventEntity {
  return new MobileScanEventEntity({
    Id: input.id,
    TaskId: 'mobile-task-1',
    TaskCode: 'MT-PT-001',
    WarehouseId: 'warehouse-1',
    OwnerId: 'owner-1',
    ScanType: input.scanType,
    RawValue: input.rawValue,
    NormalizedValue: input.normalizedValue ?? input.rawValue,
    Result: input.result ?? MobileScanResult.Accepted,
    ResolvedObjectType: input.resolvedObjectId ? 'SKU' : null,
    ResolvedObjectId: input.resolvedObjectId ?? null,
    ParsedValueJson: input.parsed ?? {},
    ActorUserId: input.actorUserId ?? 'picker-1',
    CreatedAt: input.createdAt ?? now,
  });
}

class MemoryPickReleaseRepository implements IPickReleaseRepository {
  constructor(public task: PickTaskEntity = makePickTask()) {}

  async Create(): Promise<PickReleaseAggregate> {
    throw new Error('not used');
  }

  async FindById(): Promise<PickReleaseAggregate | null> {
    return null;
  }

  async FindTaskById(id: string): Promise<PickTaskEntity | null> {
    return this.task.Id === id ? this.task : null;
  }

  async FindTaskByIdForUpdate(id: string): Promise<PickTaskEntity | null> {
    return this.FindTaskById(id);
  }

  async SaveTask(task: PickTaskEntity): Promise<PickTaskEntity> {
    this.task = task;
    return task;
  }

  async FindByIdempotencyKey(): Promise<PickReleaseAggregate | null> {
    return null;
  }

  async FindActiveByOutboundOrderId(): Promise<PickReleaseAggregate | null> {
    return null;
  }

  async ListCandidates(): Promise<PickReleaseAggregate[]> {
    return [];
  }
}

class MemoryTaskExecutionRepository implements ITaskExecutionRepository {
  public scanEvents: MobileScanEventEntity[];

  constructor(
    public mobileTask: MobileTaskEntity = makeMobileTask(),
    scanEvents?: MobileScanEventEntity[],
  ) {
    this.scanEvents = scanEvents ?? [
      makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
      makeScan({
        id: 'scan-item',
        scanType: MobileScanType.Item,
        rawValue: '(01)00000000000001(10)LOT-1(30)5',
        normalizedValue: '00000000000001',
        resolvedObjectId: 'sku-1',
        parsed: { Lot: 'LOT-1', Quantity: 5 },
      }),
    ];
  }

  async FindCandidates(_filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    void _filter;
    return [this.mobileTask];
  }

  async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.mobileTask.Id === id ? this.mobileTask : null;
  }

  async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  async FindBySourceDocument(sourceDocumentType: string, sourceDocumentId: string): Promise<MobileTaskEntity | null> {
    return this.mobileTask.SourceDocumentType === sourceDocumentType &&
      this.mobileTask.SourceDocumentId === sourceDocumentId
      ? this.mobileTask
      : null;
  }

  async FindScanEventsByTaskId(taskId: string): Promise<MobileScanEventEntity[]> {
    return this.scanEvents.filter((scan) => scan.TaskId === taskId);
  }

  async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.mobileTask = task;
    return task;
  }

  async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    this.scanEvents.push(scan);
    return scan;
  }

  async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work({} as EntityManager);
  }
}

class MemoryAuditedTransaction {
  public entries: AuditEntry[] = [];

  async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(...(Array.isArray(entry) ? entry : [entry]));
    return result;
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

class MemoryOutboundOrderRepository implements Partial<IOutboundOrderRepository> {
  async FindById(): Promise<OutboundOrderAggregate | null> {
    return { Order: { CoreFlowInstanceId: 'core-flow-1' }, Lines: [] } as unknown as OutboundOrderAggregate;
  }
}

class AllowPermissionChecker implements IPermissionChecker {
  async Check(): Promise<PermissionDecision> {
    return { Allowed: true };
  }
}

function fakeInventoryResult(): InventoryControlResultDto {
  return {
    InventoryTransaction: {
      Id: 'inventory-transaction-1',
      TransactionCode: 'ITX-001',
      TransactionType: 'StatusChange',
      TransactionStatus: 'Posted',
      PutawayTaskId: null,
      PutawayTaskCode: null,
      InventoryMovementId: 'movement-1',
      OwnerId: 'owner-1',
      OwnerCode: 'OWN',
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WH-1',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: 5,
      FromInventoryStatusCode: 'AVAILABLE',
      ToInventoryStatusCode: 'PICKED',
      FromLocationId: 'loc-source',
      FromLocationCode: null,
      ToLocationId: 'loc-source',
      ToLocationCode: 'SOURCE',
      LpnCode: null,
      SsccCode: null,
      IdempotencyKey: 'pick-confirm-1',
      OutboxMessageId: 'inventory-outbox-1',
      ReasonCode: 'RC-V1-DISCREPANCY',
      ReasonCodeId: 'reason-1',
      ReasonNote: null,
      EvidenceRefs: [],
      PostedAt: now.toISOString(),
      PostedBy: 'picker-1',
      CreatedAt: now.toISOString(),
      UpdatedAt: now.toISOString(),
    },
    InventoryMovement: {
      Id: 'movement-1',
      MovementCode: 'IMV-001',
      MovementStatus: 'Posted',
      InventoryTransactionId: 'inventory-transaction-1',
      PutawayTaskId: null,
      PutawayTaskCode: null,
      OwnerId: 'owner-1',
      OwnerCode: 'OWN',
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WH-1',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: 5,
      FromDimensionId: 'dimension-source',
      FromBalanceId: 'balance-source',
      FromLocationId: 'loc-source',
      FromLocationCode: null,
      FromInventoryStatusCode: 'AVAILABLE',
      ToDimensionId: 'dimension-picked',
      ToBalanceId: 'balance-picked',
      ToLocationId: 'loc-source',
      ToLocationCode: 'SOURCE',
      ToInventoryStatusCode: 'PICKED',
      LpnCode: null,
      SsccCode: null,
      ScanEvidenceJson: {},
      CreatedAt: now.toISOString(),
      CreatedBy: 'picker-1',
    },
    SourceBalance: {
      BalanceId: 'balance-source',
      DimensionId: 'dimension-source',
      QtyOnHand: 0,
      QtyReserved: 0,
      QtyAvailable: 0,
    },
    TargetBalance: {
      BalanceId: 'balance-picked',
      DimensionId: 'dimension-picked',
      QtyOnHand: 5,
      QtyReserved: 0,
      QtyAvailable: 5,
    },
    OutboxMessageId: 'inventory-outbox-1',
    EventType: 'InventoryStatusChanged',
    IsDuplicate: false,
  } as InventoryControlResultDto;
}

function buildHarness(input?: {
  mobileTask?: MobileTaskEntity;
  scans?: MobileScanEventEntity[];
  pickTask?: PickTaskEntity;
}) {
  const pickReleases = new MemoryPickReleaseRepository(input?.pickTask);
  const taskExecution = new MemoryTaskExecutionRepository(input?.mobileTask, input?.scans);
  const audited = new MemoryAuditedTransaction();
  const integrations = new MemoryIntegrationRepository();
  const coreFlows = new MemoryCoreFlowRepository();
  const inventoryControl = {
    ChangeStatusInTransaction: jest.fn(async (request: unknown) => ({
      result: fakeInventoryResult(),
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.InventoryMovement,
        AfterJson: request as Record<string, unknown>,
        Result: AuditResult.Success,
      }),
    })),
  };
  const service = new PickTaskConfirmationService(
    pickReleases,
    new MemoryOutboundOrderRepository() as unknown as IOutboundOrderRepository,
    taskExecution,
    inventoryControl as unknown as InventoryControlUseCase,
    integrations as unknown as IIntegrationRepository,
    coreFlows as unknown as ICoreFlowRepository,
    audited as unknown as AuditedTransaction,
    new AllowPermissionChecker(),
  );
  return { service, pickReleases, taskExecution, audited, integrations, coreFlows, inventoryControl };
}

describe('PickTaskConfirmationService', () => {
  it('declares pick confirmation routes, permissions, and idempotency request schema', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PickTaskController)).toBe('pick-tasks');
    expect(Reflect.getMetadata(PATH_METADATA, PickTaskController.prototype.Confirm)).toBe(':id/confirm');
    expect(Reflect.getMetadata(METHOD_METADATA, PickTaskController.prototype.Confirm)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PickTaskController.prototype.Confirm)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
    });

    expect(Reflect.getMetadata(PATH_METADATA, MobilePickTaskController)).toBe('mobile/tasks');
    expect(Reflect.getMetadata(PATH_METADATA, MobilePickTaskController.prototype.Confirm)).toBe(':id/confirm');
    expect(Reflect.getMetadata(METHOD_METADATA, MobilePickTaskController.prototype.Confirm)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, MobilePickTaskController.prototype.Confirm)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
    });

    const invalid = Object.assign(new ConfirmPickTaskRequest(), { IdempotencyKey: '' });
    expect(validateSync(invalid).map((error) => error.property)).toContain('IdempotencyKey');

    const valid = Object.assign(new ConfirmPickTaskRequest(), {
      IdempotencyKey: 'pick-confirm-1',
      EvidenceRefs: ['scan-1'],
    });
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('confirms picked inventory from accepted mobile scans and completes both tasks', async () => {
    const { service, pickReleases, taskExecution, audited, integrations, coreFlows, inventoryControl } = buildHarness();

    const result = await service.ConfirmByMobileTask(
      'mobile-task-1',
      { IdempotencyKey: 'pick-confirm-1', EvidenceRefs: ['rf-session:1'] },
      context,
    );

    expect(result.IsDuplicate).toBe(false);
    expect(result.PickTask.Status).toBe(PickTaskStatus.Completed);
    expect(result.InventoryControl?.InventoryTransaction.ToInventoryStatusCode).toBe('PICKED');
    expect(pickReleases.task.Status).toBe(PickTaskStatus.Completed);
    expect(taskExecution.mobileTask.TaskStatus).toBe(MobileTaskStatus.Completed);
    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        SourceBalanceId: 'balance-source',
        TargetInventoryStatusCode: 'PICKED',
        Quantity: 5,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: expect.arrayContaining(['rf-session:1', 'mobile-scan:scan-location', 'mobile-scan:scan-item']),
      }),
      context,
      expect.any(Object),
    );
    expect(integrations.outbox[0]).toMatchObject({ EventType: 'PickTaskConfirmed' });
    expect(coreFlows.milestones[0]).toMatchObject({ StepCode: 'PickConfirmed', MilestoneStatus: 'Completed' });
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ObjectType: ObjectType.InventoryMovement, Result: AuditResult.Success }),
        expect.objectContaining({ ObjectType: ObjectType.PickTask, Result: AuditResult.Success }),
        expect.objectContaining({ ObjectType: ObjectType.MobileTask, Result: AuditResult.Success }),
      ]),
    );
  });

  it('accepts source location scans resolved by object id', async () => {
    const { service, inventoryControl } = buildHarness({
      scans: [
        makeScan({
          id: 'scan-location',
          scanType: MobileScanType.Location,
          rawValue: 'LOC-A-01',
          normalizedValue: 'LOC-A-01',
          resolvedObjectId: 'loc-source',
        }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(10)LOT-1(30)5',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Lot: 'LOT-1', Quantity: 5 },
        }),
      ],
    });

    await service.ConfirmByMobileTask('mobile-task-1', { IdempotencyKey: 'pick-confirm-1' }, context);

    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
  });

  it('blocks missing source location scan without inventory mutation', async () => {
    const { service, audited, integrations, inventoryControl } = buildHarness({
      scans: [
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: 'sku',
          resolvedObjectId: 'sku-1',
          parsed: { Lot: 'LOT-1', Quantity: 5 },
        }),
      ],
    });

    await expect(service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-1' }, context)).rejects.toBeInstanceOf(
      BusinessRuleException,
    );

    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
    expect(integrations.outbox).toHaveLength(0);
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ObjectType: ObjectType.PickTask, Result: AuditResult.Failed }),
        expect.objectContaining({ ObjectType: ObjectType.MobileTask, Result: AuditResult.Failed }),
      ]),
    );
  });

  it('blocks confirmation when the latest item scan is rejected after an accepted item scan', async () => {
    const { service, audited, integrations, inventoryControl } = buildHarness({
      scans: [
        makeScan({
          id: 'scan-location',
          scanType: MobileScanType.Location,
          rawValue: 'loc-source',
          createdAt: new Date('2026-06-24T00:00:01.000Z'),
        }),
        makeScan({
          id: 'scan-item-accepted',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(10)LOT-1(30)5',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Lot: 'LOT-1', Quantity: 5 },
          createdAt: new Date('2026-06-24T00:00:02.000Z'),
        }),
        makeScan({
          id: 'scan-item-rejected',
          scanType: MobileScanType.Item,
          rawValue: '(01)99999999999999',
          normalizedValue: '99999999999999',
          result: MobileScanResult.Rejected,
          createdAt: new Date('2026-06-24T00:00:03.000Z'),
        }),
      ],
    });

    await expect(service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-1' }, context)).rejects.toBeInstanceOf(
      BusinessRuleException,
    );

    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
    expect(integrations.outbox).toHaveLength(0);
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ObjectType: ObjectType.PickTask, Result: AuditResult.Failed }),
        expect.objectContaining({ ObjectType: ObjectType.MobileTask, Result: AuditResult.Failed }),
      ]),
    );
  });

  it('requires an idempotency key before confirming pick task', async () => {
    const { service, integrations, inventoryControl } = buildHarness();

    await expect(service.Confirm('pick-task-1', { IdempotencyKey: '   ' }, context)).rejects.toThrow(
      'IdempotencyKey is required for pick confirmation',
    );

    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
    expect(integrations.outbox).toHaveLength(0);
  });

  it('rejects confirmation by a different user', async () => {
    const { service, audited, inventoryControl } = buildHarness({
      mobileTask: makeMobileTask({ AssignedUserId: 'picker-2' }),
    });

    await expect(service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-1' }, context)).rejects.toThrow(
      'Only the current claimant can confirm this pick task',
    );
    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ObjectType: ObjectType.PickTask, Result: AuditResult.Failed }),
        expect.objectContaining({ ObjectType: ObjectType.MobileTask, Result: AuditResult.Failed }),
      ]),
    );
  });

  it('returns duplicate result for the same confirm payload without posting inventory twice', async () => {
    const { service, inventoryControl } = buildHarness();
    const request = { IdempotencyKey: 'pick-confirm-1', EvidenceRefs: ['rf-session:1'] };

    const first = await service.Confirm('pick-task-1', request, context);
    const second = await service.Confirm('pick-task-1', request, context);

    expect(first.IsDuplicate).toBe(false);
    expect(second.IsDuplicate).toBe(true);
    expect(second.InventoryControl).toEqual(first.InventoryControl);
    expect(second.ScanEvidence).toEqual(first.ScanEvidence);
    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate replay by a different user without posting inventory twice', async () => {
    const { service, audited, inventoryControl } = buildHarness();
    const request = { IdempotencyKey: 'pick-confirm-1', EvidenceRefs: ['rf-session:1'] };
    const otherUserContext = { ...context, ActorUserId: 'picker-2' };

    await service.Confirm('pick-task-1', request, context);
    await expect(service.Confirm('pick-task-1', request, otherUserContext)).rejects.toThrow(
      'Only the original claimant can replay this pick confirmation',
    );

    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ObjectType: ObjectType.PickTask, Result: AuditResult.Failed }),
        expect.objectContaining({ ObjectType: ObjectType.MobileTask, Result: AuditResult.Failed }),
      ]),
    );
  });

  it('rejects pick confirmation with a WRONG_SERIAL code when the operator scans a different serial than the allocated dimension (IDC-05 AC5)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ SerialNumber: 'SN-1', Quantity: 1 }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(21)SN-WRONG(30)1',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Lot: 'LOT-1', Serial: 'SN-WRONG', Quantity: 1 },
        }),
      ],
    });

    let caught: unknown;
    try {
      await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-serial' }, context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    const scanEvidence = (caught as BusinessRuleException).Details as { ScanEvidence: PickTaskScanEvidenceDto[] };
    expect(scanEvidence.ScanEvidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ ScanType: 'Serial', RejectionCode: 'WRONG_SERIAL' })]),
    );
    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
  });

  it('rejects pick confirmation with a WRONG_LOT code when the operator scans a different lot than the allocated dimension (IDC-05 AC5)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ LotNumber: 'LOT-REQUESTED' }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(10)LOT-OTHER(30)5',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Lot: 'LOT-OTHER', Quantity: 5 },
        }),
      ],
    });

    let caught: unknown;
    try {
      await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-lot' }, context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    const scanEvidence = (caught as BusinessRuleException).Details as { ScanEvidence: PickTaskScanEvidenceDto[] };
    expect(scanEvidence.ScanEvidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ ScanType: 'Lot', RejectionCode: 'WRONG_LOT' })]),
    );
    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
  });

  it('confirms successfully when a dedicated Serial scan-type (not embedded in the Item scan) matches the allocated dimension (IDC-06 AC5)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ LotNumber: null, SerialNumber: 'SN-1', Quantity: 1 }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(30)1',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Quantity: 1 },
        }),
        makeScan({ id: 'scan-serial', scanType: MobileScanType.Serial, rawValue: 'SN-1', normalizedValue: 'SN-1' }),
      ],
    });

    const result = await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-dedicated-serial' }, context);

    expect(result.IsDuplicate).toBe(false);
    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
  });

  it('confirms successfully when a dedicated Lot scan-type (not embedded in the Item scan) matches the allocated dimension (IDC-06 AC5)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ LotNumber: 'LOT-1' }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(30)5',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Quantity: 5 },
        }),
        makeScan({ id: 'scan-lot', scanType: MobileScanType.Lot, rawValue: 'LOT-1', normalizedValue: 'LOT-1' }),
      ],
    });

    const result = await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-dedicated-lot' }, context);

    expect(result.IsDuplicate).toBe(false);
    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects pick confirmation with a WRONG_SERIAL code when a dedicated Serial scan-type mismatches, even without any Item-embedded serial (IDC-06 AC4)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ SerialNumber: 'SN-1', Quantity: 1 }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(30)1',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Quantity: 1 },
        }),
        makeScan({
          id: 'scan-serial',
          scanType: MobileScanType.Serial,
          rawValue: 'SN-WRONG',
          normalizedValue: 'SN-WRONG',
        }),
      ],
    });

    let caught: unknown;
    try {
      await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-dedicated-serial-wrong' }, context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    const scanEvidence = (caught as BusinessRuleException).Details as { ScanEvidence: PickTaskScanEvidenceDto[] };
    expect(scanEvidence.ScanEvidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ ScanType: 'Serial', RejectionCode: 'WRONG_SERIAL' })]),
    );
    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
  });

  it('rejects pick confirmation with a WRONG_EXPIRYDATE code when a dedicated ExpiryDate scan-type mismatches (IDC-06 AC4)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ ExpiryDate: new Date('2027-01-31T00:00:00.000Z') }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(30)5',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Quantity: 5 },
        }),
        makeScan({
          id: 'scan-expiry',
          scanType: MobileScanType.ExpiryDate,
          rawValue: '2027-02-28',
          normalizedValue: '2027-02-28',
        }),
      ],
    });

    let caught: unknown;
    try {
      await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-dedicated-expiry-wrong' }, context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    const scanEvidence = (caught as BusinessRuleException).Details as { ScanEvidence: PickTaskScanEvidenceDto[] };
    expect(scanEvidence.ScanEvidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ ScanType: 'ExpiryDate', RejectionCode: 'WRONG_EXPIRYDATE' })]),
    );
    expect(inventoryControl.ChangeStatusInTransaction).not.toHaveBeenCalled();
  });

  it('blocks pick confirmation when the task has a SerialNumber but Quantity != 1 (IFB-14)', async () => {
    // Scans deliberately match the task exactly (Location/Item/Quantity/Serial all consistent) so
    // that without the new guard this scenario would confirm cleanly -- proving the guard, not some
    // unrelated scan mismatch, is what blocks it.
    const { service } = buildHarness({
      pickTask: makePickTask({ LotNumber: null, SerialNumber: 'SN-1', Quantity: 3 }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(21)SN-1(30)3',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Serial: 'SN-1', Quantity: 3 },
        }),
      ],
    });

    await expect(
      service.Confirm('pick-task-1', { IdempotencyKey: 'ifb14-multi-unit-serial-pick-1' }, context),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('keeps confirming via the legacy Item-scan-embedded GS1 lot/serial when no dedicated scan-type is sent (IDC-06 AC6 regression)', async () => {
    const { service, inventoryControl } = buildHarness({
      pickTask: makePickTask({ LotNumber: null, SerialNumber: 'SN-1', Quantity: 1 }),
      scans: [
        makeScan({ id: 'scan-location', scanType: MobileScanType.Location, rawValue: 'loc-source' }),
        makeScan({
          id: 'scan-item',
          scanType: MobileScanType.Item,
          rawValue: '(01)00000000000001(21)SN-1(30)1',
          normalizedValue: '00000000000001',
          resolvedObjectId: 'sku-1',
          parsed: { Serial: 'SN-1', Quantity: 1 },
        }),
      ],
    });

    const result = await service.Confirm('pick-task-1', { IdempotencyKey: 'pick-confirm-legacy-gs1' }, context);

    expect(result.IsDuplicate).toBe(false);
    expect(inventoryControl.ChangeStatusInTransaction).toHaveBeenCalledTimes(1);
  });
});
