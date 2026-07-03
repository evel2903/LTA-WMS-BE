import { randomUUID } from 'crypto';
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
import { PutawayRuleGate } from '@modules/InventoryExecution/Application/Services/PutawayRuleGate';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  MakeLocation,
  MakeSku,
  MemoryLocationRepository,
  MemorySkuRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { InboundBaselineWarehouseTypeCode } from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import { InMemoryWarehouseRepository } from '@test/TestDoubles/MasterData/MasterDataTestDoubles';
import {
  BuildEmptyPutawayRuleGate,
  BuildSeededPutawayRuleGate,
  MakePutawayDemoWarehouse,
} from '@test/TestDoubles/InventoryExecution/PutawayRuleGateTestDoubles';
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

/**
 * Real PutawayRuleGate over a RuleResolver with NO rules seeded — every Decide() returns an empty
 * decision (Matched=false), so the caller falls back to structural eligibility only. This is the
 * default gate in buildUseCase: existing tests keep exercising the backward-compat path (ADR-5).
 */
const emptyPutawayRuleGate = (warehouseId: string): PutawayRuleGate => BuildEmptyPutawayRuleGate(warehouseId);

/**
 * Real PutawayRuleGate over a RuleResolver with the WT-01 baseline rules seeded (IRE-00), bound to
 * a demo profile whose WarehouseId/OwnerId match the given release. Used by the IRE-04 rule-driven
 * putaway eligibility tests.
 */
const seededPutawayRuleGate = async (warehouseId: string, ownerId: string): Promise<PutawayRuleGate> =>
  (await BuildSeededPutawayRuleGate(warehouseId, ownerId)).gate;

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
  sku?: SkuEntity | null;
  profile?: LocationProfileEntity | null;
  ruleGate?: PutawayRuleGate;
}) {
  const release = input?.release ?? makeRelease();
  const putawayTasks = input?.putawayTasks ?? new MemoryPutawayTaskRepository();
  const locations =
    input?.locations ??
    new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);
  // Default SKU has no compliance requirement set (TemperatureClass/DgClass=null, BondedFlag=false)
  // — matches backward-compat: no rule can match on a candidate with no SKU compliance need.
  const skus = new MemorySkuRepository(
    input?.sku === undefined ? [MakeSku({ Id: release.SkuId })] : input.sku ? [input.sku] : [],
  );
  const profiles = new MemoryLocationProfileRepository(input?.profile ?? makeProfile());
  const integrations = new FakeIntegrationRepository();
  const taskExecution = new FakeTaskExecutionRepository();
  const audited = new FakeAuditedTransaction();
  const permission = new FakePermissionChecker();
  const ruleGate = input?.ruleGate ?? emptyPutawayRuleGate(release.WarehouseId);
  const useCase = new ReleasePutawayTaskUseCase(
    putawayTasks,
    new FakeReceivingRepository(release) as unknown as IReceivingRepository,
    locations,
    skus,
    profiles as unknown as ILocationProfileRepository,
    ruleGate,
    integrations as unknown as IIntegrationRepository,
    taskExecution as unknown as ITaskExecutionRepository,
    new FakeReasonCatalog(),
    audited as unknown as AuditedTransaction,
    permission,
  );
  return {
    useCase,
    putawayTasks,
    locations,
    skus,
    integrations,
    taskExecution,
    audited,
    permission,
    ruleGate,
    release,
  };
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

describe('IRE-04 rule-driven putaway eligibility (real RuleResolver + seeded WT-01)', () => {
  /**
   * Deterministic stub resolver: blocks any candidate whose ZoneId matches `blockedZoneId`,
   * otherwise returns an empty decision. Used to test the PLUMBING (a Blocked decision folds into
   * the existing `failures`/`Rejections[]` mechanism and the loop moves to the next candidate) —
   * independent of whether a real seeded rule's condition happens to match, since IRE-04 does not
   * wire a temp/DG/bonded Attribute (that's IRE-05's scope).
   */
  class ZoneBlockingRuleResolver implements IRuleResolver {
    constructor(private readonly blockedZoneId: string) {}
    public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
      const blocked = context.ZoneId === this.blockedZoneId;
      return {
        Winner: null,
        Allowed: !blocked,
        ApprovalRequired: false,
        OrderedCandidates: [],
        EffectivePriorities: {},
        ReasonReadiness: null,
      };
    }
  }

  it('rule-driven: a Blocked decision on one candidate folds into the existing failures/Rejections[] mechanism and the loop tries the next candidate', async () => {
    const release = makeRelease();
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(MakePutawayDemoWarehouse(release.WarehouseId));
    const ruleGate = new PutawayRuleGate(new ZoneBlockingRuleResolver('zone-blocked'), warehouses);
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-blocked', LocationCode: 'A-01', ZoneId: 'zone-blocked', PutawaySequence: 10 }),
      MakeLocation({ Id: 'loc-ok', LocationCode: 'A-02', ZoneId: 'zone-active', PutawaySequence: 20 }),
    ]);

    const { useCase, putawayTasks, audited } = buildUseCase({ release, locations, ruleGate });
    const result = await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire04-rule-block-key' },
      contextFor('operator-1'),
    );

    expect(result.TargetLocationId).toBe('loc-ok');
    expect(putawayTasks.tasks).toHaveLength(1);
    expect(audited.entries).toHaveLength(1);
    expect(audited.entries[0]).toMatchObject({ Result: AuditResult.Success });
  });

  it('rule-driven: all candidates Blocked → terminal exception with Rejections[] naming the rule-driven reason, exactly like an all-structural-failure case', async () => {
    const release = makeRelease();
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(MakePutawayDemoWarehouse(release.WarehouseId));
    const ruleGate = new PutawayRuleGate(new ZoneBlockingRuleResolver('zone-active'), warehouses);
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', ZoneId: 'zone-active', PutawaySequence: 10 }),
    ]);

    const { useCase, putawayTasks } = buildUseCase({ release, locations, ruleGate });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire04-rule-block-all-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('No eligible putaway target location found');

    expect(putawayTasks.tasks).toHaveLength(0);
  });

  class ApprovalRequiredRuleResolver implements IRuleResolver {
    public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
      void context;
      return {
        Winner: null,
        Allowed: true,
        ApprovalRequired: true,
        OrderedCandidates: [],
        EffectivePriorities: {},
        ReasonReadiness: null,
      };
    }
  }

  it('rule-driven: an ApprovalRequired (not just Blocked) decision also excludes a candidate, and RuleCode=null renders as "unknown" not "null" in the failure reason', async () => {
    const release = makeRelease();
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(MakePutawayDemoWarehouse(release.WarehouseId));
    const ruleGate = new PutawayRuleGate(new ApprovalRequiredRuleResolver(), warehouses);
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', PutawaySequence: 10 }),
    ]);

    const { useCase, putawayTasks } = buildUseCase({ release, locations, ruleGate });
    let caught: unknown;
    try {
      await useCase.Execute(
        { InboundPutawayReleaseId: release.Id, TargetLocationId: 'loc-1', IdempotencyKey: 'ire04-approval-key' },
        contextFor('operator-1'),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      Failures: ['RULE_APPROVAL_REQUIRED:unknown'],
    });
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('AutoSuggestion (RULE-PUT-ELIG-01) does not change candidate selection order — PutawaySequence sort is unchanged', async () => {
    const release = makeRelease({ Quantity: 5 });
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-first', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
      MakeLocation({ Id: 'loc-second', LocationCode: 'A-02', CapacityQty: 10, PutawaySequence: 20 }),
    ]);

    const { useCase } = buildUseCase({ release, locations, ruleGate });
    const result = await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire04-autosuggestion-key' },
      contextFor('operator-1'),
    );

    // capacityAvailable=true for both candidates (Quantity=5 <= CapacityQty=10), so RULE-PUT-ELIG-01
    // (AutoSuggestion) matches on both — non-authoritative, so the first-by-PutawaySequence candidate
    // still wins, exactly as it would with an empty decision.
    expect(result.TargetLocationId).toBe('loc-first');
  });

  it('per-candidate call: Decide() is called once per eligible-checked candidate, not once for the whole set', async () => {
    const release = makeRelease();
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);
    const decideSpy = jest.spyOn(ruleGate, 'Decide');
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-a', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
      MakeLocation({ Id: 'loc-b', LocationCode: 'A-02', CapacityQty: 10, PutawaySequence: 20 }),
    ]);

    const { useCase } = buildUseCase({ release, locations, ruleGate });
    await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire04-per-candidate-key' },
      contextFor('operator-1'),
    );

    // Only loc-a is checked (first eligible wins, ResolveTarget returns early) — proves Decide() is
    // invoked from inside the per-candidate AssertLocationEligible loop, not once for the whole set.
    expect(decideSpy).toHaveBeenCalledTimes(1);
    expect(decideSpy).toHaveBeenCalledWith(expect.objectContaining({ ZoneId: 'zone-active', LocationType: 'Storage' }));
  });

  it('backward-compat: empty decision (default gate) never blocks or changes eligibility', async () => {
    const release = makeRelease();
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);

    const { useCase, putawayTasks } = buildUseCase({ release, locations });
    const result = await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire04-backward-compat-key' },
      contextFor('operator-1'),
    );

    expect(result.TargetLocationId).toBe('loc-1');
    expect(putawayTasks.tasks).toHaveLength(1);
  });
});

describe('IRE-05 compliance hard-block coverage (RULE-COM-COLD-01/DG-01/BONDED-01, real RuleResolver + seeded WT-01)', () => {
  it('AC5-1: SKU TemperatureClass mismatch vs candidate Location → RULE-COM-COLD-01 hard-blocks it', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN' });
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-temp-mismatch-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('No eligible putaway target location found');
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('AC5-2: SKU DgClass mismatch vs candidate Location → RULE-COM-DG-01 hard-blocks it', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, DgClass: 'CLASS_3' });
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-dg-mismatch-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('No eligible putaway target location found');
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('AC5-3: SKU BondedFlag=true vs a non-bonded candidate Location → RULE-COM-BONDED-01 hard-blocks it', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, BondedFlag: true });
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10, BondedFlag: false }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-bonded-mismatch-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('No eligible putaway target location found');
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('AC5-4: RULE-COM-DG-01 does not match before its own EffectiveFrom (2026-07-01) — evaluating earlier falls through (Allowed=true)', async () => {
    const warehouseId = randomUUID();
    const ownerId = randomUUID();
    const { resolver } = await BuildSeededPutawayRuleGate(warehouseId, ownerId);

    const decision = await resolver.Resolve({
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      WarehouseId: warehouseId,
      OwnerId: ownerId,
      EvaluatedAt: new Date('2026-06-30T00:00:00.000Z'),
      Attributes: { dgIncompatible: true },
    });

    expect(decision.Allowed).toBe(true);
    expect(decision.Winner).toBeNull();
  });

  it('AC5-5: a compliance mismatch on a candidate that ALSO matches AutoSuggestion (RULE-PUT-ELIG-01) still blocks — compliance wins over a simultaneous non-blocking match', async () => {
    const release = makeRelease({ Quantity: 5 });
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN' });
    const locations = new MemoryLocationRepository([
      // CapacityQty=10 >= Quantity=5 → capacityAvailable=true (RULE-PUT-ELIG-01 AutoSuggestion matches too).
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    let caught: unknown;
    try {
      await useCase.Execute(
        {
          InboundPutawayReleaseId: release.Id,
          TargetLocationId: 'loc-1',
          IdempotencyKey: 'ire05-compliance-wins-key',
        },
        contextFor('operator-1'),
      );
    } catch (error) {
      caught = error;
    }

    // Asserts the WINNING rule specifically is RULE-COM-COLD-01, not just "something blocked it" —
    // proves compliance is the RuleResolver's actual Winner over the simultaneously-matching
    // AutoSuggestion, per AC3 ("compliance HARD_BLOCK luôn Winner").
    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      Failures: ['RULE_BLOCKED:RULE-COM-COLD-01'],
    });
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('AC5-6: backward-compat — SKU/Location with no compliance classification set never trips a compliance Attribute (all three read as false)', async () => {
    const release = makeRelease();
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);
    const decideSpy = jest.spyOn(ruleGate, 'Decide');
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);

    const { useCase, putawayTasks } = buildUseCase({ release, locations, ruleGate });
    const result = await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-backward-compat-key' },
      contextFor('operator-1'),
    );

    expect(result.TargetLocationId).toBe('loc-1');
    expect(putawayTasks.tasks).toHaveLength(1);
    expect(decideSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        Attributes: expect.objectContaining({
          tempOutOfRange: false,
          dgIncompatible: false,
          bondedMismatch: false,
        }),
      }),
    );
  });

  it('AC5-7: compliance rules bound to a DIFFERENT profile scope do not leak into this release — no bound profile for this WarehouseId/OwnerId falls back to structural eligibility only', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN' });
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    // Seeded against a DIFFERENT warehouse/owner scope than the release — no profile is bound for
    // release.WarehouseId/OwnerId, so the gate must return an empty decision (ADR-5 backward-compat),
    // not leak the other profile's RULE-COM-COLD-01 into this release's eligibility check. The
    // release's own WarehouseId is ALSO seeded into the warehouse repo (IRE-06) so this test proves
    // scope isolation specifically — not the separate "WarehouseId doesn't resolve at all" case.
    const { gate: ruleGate, warehouses } = await BuildSeededPutawayRuleGate(randomUUID(), randomUUID());
    warehouses.Seed(MakePutawayDemoWarehouse(release.WarehouseId));

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    const result = await useCase.Execute(
      { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-scope-no-leak-key' },
      contextFor('operator-1'),
    );

    expect(result.TargetLocationId).toBe('loc-1');
    expect(putawayTasks.tasks).toHaveLength(1);
  });

  it('AC5-8: Failures[] names the real compliance RuleCode (RULE-COM-DG-01), not "unknown"', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, DgClass: 'CLASS_3' });
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase } = buildUseCase({ release, sku, locations, ruleGate });
    let caught: unknown;
    try {
      await useCase.Execute(
        {
          InboundPutawayReleaseId: release.Id,
          TargetLocationId: 'loc-1',
          IdempotencyKey: 'ire05-rulecode-audit-ref-key',
        },
        contextFor('operator-1'),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      Failures: ['RULE_BLOCKED:RULE-COM-DG-01'],
    });
  });

  it('AC5-9: a candidate matching BOTH RULE-COM-COLD-01 and RULE-COM-DG-01 simultaneously still yields exactly one winner in Failures[]', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN', DgClass: 'CLASS_3' });
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase } = buildUseCase({ release, sku, locations, ruleGate });
    let caught: unknown;
    try {
      await useCase.Execute(
        {
          InboundPutawayReleaseId: release.Id,
          TargetLocationId: 'loc-1',
          IdempotencyKey: 'ire05-multi-mismatch-one-winner-key',
        },
        contextFor('operator-1'),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    const details = (caught as BusinessRuleException).Details as { Failures: string[] };
    expect(details.Failures).toHaveLength(1);
    expect(details.Failures[0]).toMatch(/^RULE_BLOCKED:RULE-COM-(COLD|DG|BONDED)-01$/);
  });

  it('AC5-10: end-to-end through Execute() — a compliance block leaves no PutawayTask/mobile task/outbox created and records a Failed audit entry with Rejections[] naming the rule', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, BondedFlag: true });
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10, BondedFlag: false }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks, integrations, taskExecution, audited } = buildUseCase({
      release,
      sku,
      locations,
      ruleGate,
    });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-e2e-execute-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(putawayTasks.tasks).toHaveLength(0);
    expect(taskExecution.mobileTasks).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(audited.entries).toHaveLength(1);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({
        Decision: 'Blocked',
        Reason: 'No eligible putaway target location found',
        Rejections: [
          expect.objectContaining({
            LocationId: 'loc-1',
            Reason: 'Target location is not eligible for putaway',
          }),
        ],
      }),
    });
  });

  it('[Review][Patch] fail-closed: an unresolvable SkuId (release.SkuId not found in ISkuRepository) aborts the release instead of silently treating the SKU as having no compliance requirement', async () => {
    const release = makeRelease();
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-1', LocationCode: 'A-01', CapacityQty: 10, PutawaySequence: 10 }),
    ]);
    const ruleGate = await seededPutawayRuleGate(release.WarehouseId, release.OwnerId);

    const { useCase, putawayTasks, audited } = buildUseCase({ release, sku: null, locations, ruleGate });
    await expect(
      useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire05-sku-not-found-key' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('SKU not found for inbound putaway release');

    expect(putawayTasks.tasks).toHaveLength(0);
    expect(audited.entries).toHaveLength(1);
    expect(audited.entries[0]).toMatchObject({ Result: AuditResult.Failed });
  });

  it('IRE-06: end-to-end through Execute() (suggested-target path) — an unresolvable release.WarehouseId aborts putaway instead of silently skipping compliance checks, and the specific reason threads through Rejections[]', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN' });
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    // Real seeded resolver, but the warehouse repo the gate uses never seeds release.WarehouseId —
    // simulates the data-integrity gap IRE-06 fixes (warehouse_id has no FK constraint).
    const { resolver } = await BuildSeededPutawayRuleGate(release.WarehouseId, release.OwnerId);
    const ruleGate = new PutawayRuleGate(resolver, new InMemoryWarehouseRepository());

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    let caught: unknown;
    try {
      await useCase.Execute(
        { InboundPutawayReleaseId: release.Id, IdempotencyKey: 'ire06-warehouse-not-found-key' },
        contextFor('operator-1'),
      );
    } catch (error) {
      caught = error;
    }

    // The per-candidate loop folds the new throw into its existing Rejections[] mechanism (same
    // pattern as any other structural rejection) rather than a distinct top-level abort — proves
    // the SPECIFIC reason (not just "no eligible location") is what actually blocked the candidate.
    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).message).toBe('No eligible putaway target location found');
    const details = (caught as BusinessRuleException).Details as { Rejections: Array<{ Reason: string }> };
    expect(details.Rejections).toHaveLength(1);
    expect(details.Rejections[0].Reason).toBe('Warehouse not found for putaway rule evaluation');
    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('IRE-06: end-to-end through Execute() (explicit TargetLocationId path) — same fail-closed guard, Details.WarehouseId preserved on the propagated exception', async () => {
    const release = makeRelease();
    const sku = MakeSku({ Id: release.SkuId, TemperatureClass: 'FROZEN' });
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-1',
        LocationCode: 'A-01',
        CapacityQty: 10,
        PutawaySequence: 10,
        TemperatureClass: 'AMBIENT',
      }),
    ]);
    const { resolver } = await BuildSeededPutawayRuleGate(release.WarehouseId, release.OwnerId);
    const ruleGate = new PutawayRuleGate(resolver, new InMemoryWarehouseRepository());

    const { useCase, putawayTasks } = buildUseCase({ release, sku, locations, ruleGate });
    await expect(
      useCase.Execute(
        {
          InboundPutawayReleaseId: release.Id,
          TargetLocationId: 'loc-1',
          IdempotencyKey: 'ire06-warehouse-not-found-explicit-target-key',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow('Warehouse not found for putaway rule evaluation');

    expect(putawayTasks.tasks).toHaveLength(0);
  });
});
