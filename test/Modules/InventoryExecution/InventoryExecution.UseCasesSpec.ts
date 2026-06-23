import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { ListPutawayTasksUseCase } from '@modules/InventoryExecution/Application/UseCases/ListPutawayTasksUseCase';
import { ReleasePutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReleasePutawayTaskUseCase';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { MakeLocation, MemoryLocationRepository } from '@test/Modules/MasterData/InventoryTestDoubles';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { EntityManager } from 'typeorm';

const now = new Date('2026-06-23T03:00:00.000Z');
const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

const makeRelease = (overrides: Partial<InboundPutawayReleaseEntity> = {}) =>
  new InboundPutawayReleaseEntity({
    Id: overrides.Id ?? 'release-1',
    InboundLpnId: overrides.InboundLpnId ?? 'lpn-1',
    ReceiptId: overrides.ReceiptId ?? 'receipt-1',
    ReceiptLineId: overrides.ReceiptLineId ?? 'receipt-line-1',
    InboundPlanId: overrides.InboundPlanId ?? 'plan-1',
    InboundPlanLineId: overrides.InboundPlanLineId ?? 'plan-line-1',
    OwnerId: overrides.OwnerId ?? 'owner-active',
    OwnerCode: overrides.OwnerCode ?? 'OWNER-A',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-active',
    WarehouseCode: overrides.WarehouseCode ?? 'WH-A',
    SkuId: overrides.SkuId ?? 'sku-active',
    SkuCode: overrides.SkuCode ?? 'SKU-A',
    UomId: overrides.UomId ?? 'uom-ea',
    UomCode: overrides.UomCode ?? 'EA',
    Quantity: overrides.Quantity ?? 5,
    LpnCode: overrides.LpnCode ?? 'LPN-001',
    SsccCode: overrides.SsccCode ?? '000000000000000001',
    InventoryStatusCode: overrides.InventoryStatusCode ?? 'READY_FOR_PUTAWAY',
    CurrentLocationId: overrides.CurrentLocationId ?? 'staging-1',
    CurrentLocationCode: overrides.CurrentLocationCode ?? 'RCV-STG-01',
    WarehouseProfileId: overrides.WarehouseProfileId ?? 'warehouse-profile-1',
    LabelDecision: overrides.LabelDecision ?? null,
    LabelReason: overrides.LabelReason ?? null,
    MatchedPrintJobId: overrides.MatchedPrintJobId ?? null,
    ConstraintJson: overrides.ConstraintJson ?? null,
    OutboxMessageId: overrides.OutboxMessageId ?? 'outbox-inbound-1',
    CoreFlowMilestoneId: overrides.CoreFlowMilestoneId ?? null,
    ReasonCode: overrides.ReasonCode ?? null,
    ReasonCodeId: overrides.ReasonCodeId ?? null,
    ReasonNote: overrides.ReasonNote ?? null,
    EvidenceRefs: overrides.EvidenceRefs ?? [],
    IdempotencyKey: overrides.IdempotencyKey ?? 'release-key-1',
    ReleasedAt: overrides.ReleasedAt ?? now,
    ReleasedBy: overrides.ReleasedBy ?? 'operator-1',
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeProfile = (overrides: Partial<ConstructorParameters<typeof LocationProfileEntity>[0]> = {}) =>
  new LocationProfileEntity({
    Id: 'profile-active',
    ProfileCode: 'STORAGE',
    ProfileName: 'Storage',
    LocationType: 'Storage',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

class MemoryPutawayTaskRepository implements IPutawayTaskRepository {
  public tasks: PutawayTaskEntity[] = [];

  public async Create(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    if (this.tasks.some((item) => item.InboundPutawayReleaseId === task.InboundPutawayReleaseId)) {
      throw new ConflictException('Putaway task already exists');
    }
    this.tasks.push(task);
    return task;
  }

  public async FindById(id: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<PutawayTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindByInboundPutawayReleaseId(inboundPutawayReleaseId: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId) ?? null;
  }

  public async FindByIdempotencyKey(
    inboundPutawayReleaseId: string,
    idempotencyKey: string,
  ): Promise<PutawayTaskEntity | null> {
    return (
      this.tasks.find(
        (task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId && task.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async Save(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) {
      this.tasks[index] = task;
    } else {
      this.tasks.push(task);
    }
    return task;
  }

  public async List(
    skip: number,
    take: number,
    filter: Parameters<IPutawayTaskRepository['List']>[2] = {},
  ): Promise<{ Items: PutawayTaskEntity[]; TotalItems: number }> {
    let items = this.tasks;
    if (filter?.WarehouseId) items = items.filter((task) => task.WarehouseId === filter.WarehouseId);
    if (filter?.OwnerId) items = items.filter((task) => task.OwnerId === filter.OwnerId);
    if (filter?.TaskStatus) items = items.filter((task) => task.TaskStatus === filter.TaskStatus);
    if (filter?.InboundPutawayReleaseId) {
      items = items.filter((task) => task.InboundPutawayReleaseId === filter.InboundPutawayReleaseId);
    }
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class MemoryLocationProfileRepository implements Partial<ILocationProfileRepository> {
  constructor(private readonly profile: LocationProfileEntity | null = makeProfile()) {}

  public async FindById(): Promise<LocationProfileEntity | null> {
    return this.profile;
  }
}

class FakeReceivingRepository {
  constructor(private readonly release: InboundPutawayReleaseEntity) {}

  public async FindInboundPutawayReleaseById(id: string): Promise<InboundPutawayReleaseEntity | null> {
    return this.release.Id === id ? this.release : null;
  }
}

class FakeIntegrationRepository {
  public outboxMessages: OutboxMessageEntity[] = [];

  public async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.outboxMessages.push(outboxMessage);
    return outboxMessage;
  }
}

class FakeTaskExecutionRepository implements Partial<ITaskExecutionRepository> {
  public mobileTasks: MobileTaskEntity[] = [];

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.mobileTasks.push(task);
    return task;
  }

  public async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work(undefined as unknown as EntityManager);
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public async ValidateReason(): Promise<{
    ReasonCodeId: string;
    EvidenceRequired: boolean;
    ApprovalRequired: boolean;
  }> {
    return { ReasonCodeId: 'reason-1', EvidenceRequired: false, ApprovalRequired: false };
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public calls: Array<{ Action: ActionCode; ObjectType: ObjectType; WarehouseId?: string | null }> = [];

  public async Check(context: {
    Action: ActionCode;
    ObjectType: ObjectType;
    Scope?: { WarehouseId?: string | null };
  }): Promise<PermissionDecision> {
    this.calls.push({
      Action: context.Action,
      ObjectType: context.ObjectType,
      WarehouseId: context.Scope?.WarehouseId,
    });
    return { Allowed: true };
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(work: () => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work();
    this.entries.push(entry);
    return result;
  }
}

function buildUseCase(input?: {
  release?: InboundPutawayReleaseEntity;
  putawayTasks?: MemoryPutawayTaskRepository;
  locations?: MemoryLocationRepository;
  profile?: LocationProfileEntity | null;
}) {
  const release = input?.release ?? makeRelease();
  const putawayTasks = input?.putawayTasks ?? new MemoryPutawayTaskRepository();
  const locations =
    input?.locations ??
    new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);
  const profiles = new MemoryLocationProfileRepository(input?.profile ?? makeProfile());
  const integrations = new FakeIntegrationRepository();
  const taskExecution = new FakeTaskExecutionRepository();
  const audited = new FakeAuditedTransaction();
  const permission = new FakePermissionChecker();
  const useCase = new ReleasePutawayTaskUseCase(
    putawayTasks,
    new FakeReceivingRepository(release) as unknown as IReceivingRepository,
    locations,
    profiles as unknown as ILocationProfileRepository,
    integrations as unknown as IIntegrationRepository,
    taskExecution as unknown as ITaskExecutionRepository,
    new FakeReasonCatalog(),
    audited as unknown as AuditedTransaction,
    permission,
  );
  return { useCase, putawayTasks, locations, integrations, taskExecution, audited, permission };
}

describe('InventoryExecution putaway release use case', () => {
  it('creates a released PutawayTask, mobile task and PutawayTaskReleased outbox event', async () => {
    const { useCase, putawayTasks, integrations, taskExecution, audited, permission } = buildUseCase();

    const result = await useCase.Execute(
      {
        InboundPutawayReleaseId: 'release-1',
        SourceLocationCode: 'RCV-STG-01',
        IdempotencyKey: 'putaway-key-1',
      },
      contextFor('operator-1'),
    );

    expect(result.TaskStatus).toBe(PutawayTaskStatus.Released);
    expect(result.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(result.TargetLocationCode).toBe('A-01');
    expect(result.OutboxMessageId).toBeTruthy();
    expect(result.MobileTaskId).toBeTruthy();
    expect(putawayTasks.tasks).toHaveLength(1);
    expect(taskExecution.mobileTasks).toHaveLength(1);
    expect(taskExecution.mobileTasks[0].SourceDocumentType).toBe('PutawayTask');
    expect(integrations.outboxMessages[0]).toMatchObject({
      EventType: 'PutawayTaskReleased',
      Payload: expect.objectContaining({
        TargetLocationCode: 'A-01',
        InventoryStatusCode: 'READY_FOR_PUTAWAY',
      }),
    });
    expect(permission.calls[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.PutawayTask,
      WarehouseId: 'warehouse-active',
    });
    expect(audited.entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Success,
    });
  });

  it('rejects ineligible inventory status and writes failed audit without event', async () => {
    const { useCase, integrations, audited, putawayTasks } = buildUseCase({
      release: makeRelease({ InventoryStatusCode: 'HOLD' }),
    });

    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: 'release-1', IdempotencyKey: 'putaway-key-1' },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(putawayTasks.tasks).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
    });
  });

  it('rejects inactive, wrong-owner and capacity-insufficient target locations', async () => {
    const cases = [
      MakeLocation({ Id: 'loc-bad', LocationStatus: LocationStatus.Inactive }),
      MakeLocation({ Id: 'loc-bad', OwnerRestriction: 'OTHER-OWNER' }),
      MakeLocation({ Id: 'loc-bad', CapacityQty: 1 }),
    ];

    for (const location of cases) {
      const { useCase, putawayTasks } = buildUseCase({
        locations: new MemoryLocationRepository([location]),
      });
      await expect(
        useCase.Execute(
          {
            InboundPutawayReleaseId: 'release-1',
            TargetLocationId: 'loc-bad',
            IdempotencyKey: `putaway-key-${location.LocationStatus}-${location.OwnerRestriction}-${location.CapacityQty}`,
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(putawayTasks.tasks).toHaveLength(0);
    }
  });

  it('audits explicit target rejection with failed decision evidence', async () => {
    const { useCase, audited } = buildUseCase({
      locations: new MemoryLocationRepository([MakeLocation({ Id: 'loc-bad', CapacityQty: 1 })]),
    });

    await expect(
      useCase.Execute(
        {
          InboundPutawayReleaseId: 'release-1',
          TargetLocationId: 'loc-bad',
          IdempotencyKey: 'putaway-key-bad-target',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({
        Decision: 'Blocked',
        TargetLocationId: 'loc-bad',
      }),
    });
  });

  it('returns idempotent duplicate and conflicts when duplicate payload changes', async () => {
    const putawayTasks = new MemoryPutawayTaskRepository();
    const existing = new PutawayTaskEntity({
      TaskCode: 'PUT-EXIST',
      TaskStatus: PutawayTaskStatus.Released,
      InboundPutawayReleaseId: 'release-1',
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'receipt-line-1',
      InboundPlanId: 'plan-1',
      InboundPlanLineId: 'plan-line-1',
      OwnerId: 'owner-active',
      WarehouseId: 'warehouse-active',
      SkuId: 'sku-active',
      UomId: 'uom-ea',
      Quantity: 5,
      InventoryStatusCode: 'READY_FOR_PUTAWAY',
      SourceLocationId: 'staging-1',
      TargetLocationId: 'loc-1',
      TargetLocationCode: 'A-01',
      Priority: 50,
      IdempotencyKey: 'putaway-key-1',
      ReleasedAt: now,
    });
    putawayTasks.tasks.push(existing);
    const { useCase } = buildUseCase({ putawayTasks });

    const duplicate = await useCase.Execute(
      { InboundPutawayReleaseId: 'release-1', IdempotencyKey: 'putaway-key-1' },
      contextFor('operator-1'),
    );

    expect(duplicate.IsDuplicate).toBe(true);
    await expect(
      useCase.Execute(
        {
          InboundPutawayReleaseId: 'release-1',
          TargetLocationId: 'loc-other',
          IdempotencyKey: 'putaway-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists putaway tasks with permission filtering and PageSize max 100', async () => {
    const repo = new MemoryPutawayTaskRepository();
    for (let index = 0; index < 1050; index += 1) {
      repo.tasks.push(
        new PutawayTaskEntity({
          TaskCode: `PUT-${index}`,
          TaskStatus: PutawayTaskStatus.Released,
          InboundPutawayReleaseId: `release-${index}`,
          ReceiptId: 'receipt-1',
          ReceiptLineId: 'receipt-line-1',
          InboundPlanId: 'plan-1',
          InboundPlanLineId: 'plan-line-1',
          OwnerId: 'owner-active',
          WarehouseId: 'warehouse-active',
          SkuId: 'sku-active',
          UomId: 'uom-ea',
          Quantity: 1,
          InventoryStatusCode: 'READY_FOR_PUTAWAY',
          TargetLocationId: 'loc-1',
          TargetLocationCode: 'A-01',
          Priority: 50,
          IdempotencyKey: `key-${index}`,
          ReleasedAt: now,
        }),
      );
    }

    const useCase = new ListPutawayTasksUseCase(repo, new FakePermissionChecker());
    const result = await useCase.Execute({
      ActorUserId: 'operator-1',
      PageSize: 500,
    });
    const tailPage = await useCase.Execute({
      ActorUserId: 'operator-1',
      Page: 11,
      PageSize: 100,
    });

    expect(result.Items).toHaveLength(100);
    expect(result.Meta.PageSize).toBe(100);
    expect(tailPage.Items).toHaveLength(50);
    expect(tailPage.Meta.TotalItems).toBe(1050);
  });
});
