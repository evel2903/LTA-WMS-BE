import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { LabelBlockingPolicyMode } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingPolicyMode';
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PackingLifecycleService } from '@modules/Outbound/Application/Services/PackingLifecycleService';
import { MarkPackageReadyForStagingUseCase } from '@modules/Outbound/Application/UseCases/PackingUseCases';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { PackingController } from '@modules/Outbound/Presentation/Controllers/PackingController';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

const now = new Date('2026-06-24T00:00:00.000Z');
const context: AuditContext = {
  ActorUserId: 'packer-1',
  ActorRoleCodes: ['PACKER'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-v1-23',
  RequestId: 'req-v1-23',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

function makePickTask(overrides: Partial<PickTaskEntity> = {}): PickTaskEntity {
  return new PickTaskEntity({
    Id: 'pick-task-1',
    PickReleaseId: 'pick-release-1',
    OutboundOrderId: 'outbound-order-1',
    AllocationId: 'allocation-1',
    AllocationLineId: 'allocation-line-1',
    OutboundOrderLineId: 'order-line-1',
    TaskNumber: 'PICK-001',
    Status: PickTaskStatus.Completed,
    Sequence: 1,
    SourceBalanceId: 'balance-picked',
    SourceDimensionId: 'dimension-picked',
    SourceLocationId: 'loc-source',
    TargetReference: 'PACK',
    SkuId: 'sku-1',
    SkuCode: 'SKU-1',
    UomId: 'uom-1',
    UomCode: 'EA',
    Quantity: 5,
    InventoryStatusCode: 'PICKED',
    CompletedAt: now,
    CompletedBy: 'picker-1',
    CreatedAt: now,
    ...overrides,
  });
}

function makeMobileTask(overrides: Partial<MobileTaskEntity> = {}): MobileTaskEntity {
  return new MobileTaskEntity({
    Id: 'mobile-task-1',
    TaskCode: 'MT-PICK-001',
    TaskType: MobileTaskType.Pick,
    TaskStatus: MobileTaskStatus.Completed,
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    SourceDocumentType: 'PickTask',
    SourceDocumentId: 'pick-task-1',
    SourceDocumentCode: 'PICK-001',
    Priority: 1,
    AssignedUserId: 'picker-1',
    TaskPayload: { PickTaskId: 'pick-task-1' },
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeWarehouseProfile(overrides: Partial<WarehouseProfileEntity> = {}): WarehouseProfileEntity {
  return new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WT-01',
    ProfileName: 'Warehouse Type 01',
    WarehouseTypeCode: 'WT-01',
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    WarehouseId: 'warehouse-1',
    OwnerId: 'owner-1',
    ScopeKey: 'warehouse-1|owner-1',
    EffectiveFrom: now,
    StrategyPolicy: { packingCheckRequired: true },
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

class MemoryPackingRepository implements IPackingRepository {
  public sessions: PackSessionEntity[] = [];
  public packages: PackageEntity[] = [];
  public contents: PackageContentEntity[] = [];
  public SimulateSessionUniqueConflictOnce = false;
  public SimulatePackageUniqueConflictOnce = false;

  async CreateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    if (this.SimulateSessionUniqueConflictOnce) {
      this.SimulateSessionUniqueConflictOnce = false;
      this.sessions.push(session);
      throw uniqueViolation();
    }
    this.sessions.push(session);
    return session;
  }

  async UpdateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    this.sessions = this.sessions.map((item) => (item.Id === session.Id ? session : item));
    return session;
  }

  async FindSessionById(id: string): Promise<PackSessionEntity | null> {
    return this.sessions.find((item) => item.Id === id) ?? null;
  }

  async FindSessionByIdForUpdate(id: string): Promise<PackSessionEntity | null> {
    return this.FindSessionById(id);
  }

  async FindSessionByIdempotencyKey(key: string): Promise<PackSessionEntity | null> {
    return this.sessions.find((item) => item.IdempotencyKey === key) ?? null;
  }

  async CreatePackage(pack: PackageEntity, contents: PackageContentEntity[]): Promise<PackageAggregate> {
    if (this.SimulatePackageUniqueConflictOnce) {
      this.SimulatePackageUniqueConflictOnce = false;
      this.packages.push(pack);
      this.contents.push(...contents);
      throw uniqueViolation();
    }
    this.packages.push(pack);
    this.contents.push(...contents);
    return { Package: pack, Contents: contents };
  }

  async UpdatePackage(pack: PackageEntity, contents?: PackageContentEntity[]): Promise<PackageAggregate> {
    this.packages = this.packages.map((item) => (item.Id === pack.Id ? pack : item));
    if (contents) {
      this.contents = this.contents.filter((item) => item.PackageId !== pack.Id);
      this.contents.push(...contents);
    }
    return {
      Package: pack,
      Contents: this.contents.filter((item) => item.PackageId === pack.Id),
    };
  }

  async FindPackageById(id: string): Promise<PackageAggregate | null> {
    const pack = this.packages.find((item) => item.Id === id);
    return pack ? { Package: pack, Contents: this.contents.filter((item) => item.PackageId === id) } : null;
  }

  async FindPackageByIdForUpdate(id: string): Promise<PackageAggregate | null> {
    return this.FindPackageById(id);
  }

  async FindPackageByIdempotencyKey(key: string): Promise<PackageAggregate | null> {
    const pack = this.packages.find((item) => item.IdempotencyKey === key);
    return pack ? { Package: pack, Contents: this.contents.filter((item) => item.PackageId === pack.Id) } : null;
  }

  async ListPackages(): Promise<{ Items: PackageAggregate[]; TotalItems: number }> {
    return {
      Items: (await Promise.all(this.packages.map((item) => this.FindPackageById(item.Id)))) as PackageAggregate[],
      TotalItems: this.packages.length,
    };
  }
}

function uniqueViolation(): Error & { code: string; driverError: { code: string; message: string } } {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    driverError: { code: '23505', message: 'duplicate key value violates unique constraint' },
  });
}

class MemoryPickReleaseRepository implements IPickReleaseRepository {
  constructor(public pickTask: PickTaskEntity = makePickTask()) {}

  async Create(release: PickReleaseEntity, tasks: PickTaskEntity[]): Promise<PickReleaseAggregate> {
    return { Release: release, Tasks: tasks };
  }

  async FindById(): Promise<PickReleaseAggregate | null> {
    return null;
  }

  async FindTaskById(id: string): Promise<PickTaskEntity | null> {
    return this.pickTask.Id === id ? this.pickTask : null;
  }

  async FindTaskByIdForUpdate(id: string): Promise<PickTaskEntity | null> {
    return this.FindTaskById(id);
  }

  async SaveTask(task: PickTaskEntity): Promise<PickTaskEntity> {
    this.pickTask = task;
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
  constructor(public mobileTask: MobileTaskEntity | null = makeMobileTask()) {}

  async FindCandidates(_filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    void _filter;
    return this.mobileTask ? [this.mobileTask] : [];
  }

  async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.mobileTask?.Id === id ? this.mobileTask : null;
  }

  async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  async FindBySourceDocument(type: string, id: string): Promise<MobileTaskEntity | null> {
    return this.mobileTask?.SourceDocumentType === type && this.mobileTask.SourceDocumentId === id
      ? this.mobileTask
      : null;
  }

  async FindScanEventsByTaskId(): Promise<MobileScanEventEntity[]> {
    return [];
  }

  async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.mobileTask = task;
    return task;
  }

  async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    return scan;
  }

  async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work({} as EntityManager);
  }
}

class MemoryWarehouseProfileRepository implements IWarehouseProfileRepository {
  constructor(public profile = makeWarehouseProfile()) {}

  async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    return this.profile.Id === id ? this.profile : null;
  }

  async FindByCode(): Promise<WarehouseProfileEntity | null> {
    return this.profile;
  }

  async Create(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    this.profile = profile;
    return profile;
  }

  async Update(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    this.profile = profile;
    return profile;
  }

  async List(): Promise<{ Items: WarehouseProfileEntity[]; TotalItems: number }> {
    return { Items: [this.profile], TotalItems: 1 };
  }

  async ListActiveByScope(): Promise<WarehouseProfileEntity[]> {
    return [this.profile];
  }

  async FindActiveOverlapping(): Promise<WarehouseProfileEntity[]> {
    return [];
  }

  async RunInTransaction<T>(work: (txRepository: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>) {
    return work(this, {} as EntityManager);
  }
}

class MemoryExceptionCaseRepository implements IExceptionCaseRepository {
  public cases: ExceptionCaseEntity[] = [];

  async FindById(id: string): Promise<ExceptionCaseEntity | null> {
    return this.cases.find((item) => item.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<ExceptionCaseEntity | null> {
    return this.FindById(id);
  }

  async Create(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.cases.push(entity);
    return entity;
  }

  async Update(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.cases = this.cases.map((item) => (item.Id === entity.Id ? entity : item));
    return entity;
  }

  async List(): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }> {
    return { Items: this.cases, TotalItems: this.cases.length };
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

function makeControlException(): ControlExceptionCatalogEntity {
  return new ControlExceptionCatalogEntity({
    Id: 'catalog-pack-mismatch',
    Code: 'CTRL-V1-PACK-CHECK-MISMATCH',
    Scenario: 'Pack check mismatch',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'PACKER'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
    SourceDocRef: 'test',
    CreatedAt: now,
    UpdatedAt: now,
  });
}

const controlExceptionCatalog: IControlExceptionCatalog = {
  FindByCode: async () => makeControlException(),
  List: async () => [makeControlException()],
  ValidateExceptionType: async () => makeControlException(),
};

const reasonCatalog: IReasonCodeCatalog = {
  ValidateReason: async (input) => ({
    ReasonCodeId: `reason-${input.ReasonCode}`,
    EvidenceRequired: input.ReasonCode === 'RC-V1-DISCREPANCY',
    ApprovalRequired: false,
  }),
};

const allowPermissionChecker: IPermissionChecker = {
  Check: async (): Promise<PermissionDecision> => ({ Allowed: true }),
};

function labelBlocking(allowed: boolean) {
  return {
    Execute: jest.fn(async () => ({
      Allowed: allowed,
      Blocked: !allowed,
      Decision: allowed ? LabelBlockingDecision.Allowed : LabelBlockingDecision.Blocked,
      RequiredLabelType: 'SSCC',
      PolicyMode: LabelBlockingPolicyMode.Hard,
      OverrideAllowed: false,
      OverrideAccepted: false,
      Reason: allowed ? 'Required label evidence is valid.' : 'Required label evidence is missing.',
      MatchedPrintJobId: allowed ? 'print-job-1' : null,
      MatchedPrintJobCode: allowed ? 'PJ-001' : null,
      ValidationDetails: {},
    })),
  };
}

function makeHarness(
  input: {
    labelAllowed?: boolean;
    permissionChecker?: IPermissionChecker;
    pickTask?: PickTaskEntity;
    profile?: WarehouseProfileEntity;
  } = {},
) {
  const packing = new MemoryPackingRepository();
  const pickReleases = new MemoryPickReleaseRepository(input.pickTask ?? makePickTask());
  const taskExecution = new MemoryTaskExecutionRepository();
  const profiles = new MemoryWarehouseProfileRepository(input.profile ?? makeWarehouseProfile());
  const exceptionCases = new MemoryExceptionCaseRepository();
  const audited = new MemoryAuditedTransaction();
  const labels = labelBlocking(input.labelAllowed ?? true);
  const service = new PackingLifecycleService(
    packing,
    pickReleases,
    taskExecution,
    profiles,
    exceptionCases,
    controlExceptionCatalog,
    reasonCatalog,
    labels as never,
    audited as never,
    input.permissionChecker ?? allowPermissionChecker,
  );
  return { service, packing, exceptionCases, audited, labels, profiles };
}

async function createPassedPackage(harness = makeHarness()) {
  const session = await harness.service.StartSession(
    {
      PickTaskId: 'pick-task-1',
      MobileTaskId: 'mobile-task-1',
      WarehouseProfileId: 'profile-1',
      IdempotencyKey: 'start-session-1',
    },
    context,
  );
  await harness.service.RecordCheck(
    session.Id,
    {
      CheckResult: PackageCheckResult.Passed,
      EvidenceRefs: ['scan:check-pass'],
      IdempotencyKey: 'check-pass-1',
    },
    context,
  );
  const pack = await harness.service.CreatePackage(
    {
      PackSessionId: session.Id,
      CartonType: 'CTN-S',
      Weight: 3.5,
      Length: 40,
      Width: 30,
      Height: 20,
      EvidenceRefs: ['scan:carton'],
      IdempotencyKey: 'package-create-1',
    },
    context,
  );
  return { session, pack };
}

describe('PackingLifecycleService V1-23', () => {
  it('exposes packing routes with Package permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PackingController)).toBe('packing');
    expect(Reflect.getMetadata(PATH_METADATA, PackingController.prototype.ListPackages)).toBe('packages');
    expect(Reflect.getMetadata(METHOD_METADATA, PackingController.prototype.ListPackages)).toBe(0);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PackingController.prototype.ListPackages)).toEqual({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Package,
      Scope: {
        WarehouseId: { In: 'query', Key: 'WarehouseId' },
        OwnerId: { In: 'query', Key: 'OwnerId' },
      },
    });
    expect(Reflect.getMetadata(PATH_METADATA, PackingController.prototype.ReadyForStaging)).toBe(
      'packages/:id/ready-for-staging',
    );
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PackingController.prototype.StartSession)).toEqual({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Package,
      Scope: undefined,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PackingController.prototype.ReadyForStaging)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Package,
      Scope: undefined,
    });
  });

  it('blocks package creation when WarehouseProfile requires check and session has not passed check', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-block',
      },
      context,
    );

    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-S',
          IdempotencyKey: 'package-before-check',
        },
        context,
      ),
    ).rejects.toThrow('Pack check must pass before packing');

    expect(harness.packing.packages).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ ObjectType: ObjectType.Package, Result: AuditResult.Failed })]),
    );
  });

  it('does not allow request payload to disable WarehouseProfile required check', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        CheckRequired: false,
        IdempotencyKey: 'start-session-profile-check',
      },
      context,
    );

    expect(session.CheckRequired).toBe(true);
    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-S',
          IdempotencyKey: 'package-profile-check',
        },
        context,
      ),
    ).rejects.toThrow('Pack check must pass before packing');
  });

  it('returns controlled duplicate session when idempotency insert hits a DB unique race', async () => {
    const harness = makeHarness();
    harness.packing.SimulateSessionUniqueConflictOnce = true;

    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-race',
      },
      context,
    );

    expect(session.Id).toBe(harness.packing.sessions[0].Id);
    expect(harness.packing.sessions).toHaveLength(1);
  });

  it('creates exception case for check mismatch and keeps mismatch outside InventoryStatus', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-mismatch',
      },
      context,
    );

    const checked = await harness.service.RecordCheck(
      session.Id,
      {
        CheckResult: PackageCheckResult.Mismatch,
        EvidenceRefs: ['scale:mismatch'],
        ObservedQuantity: 4,
        IdempotencyKey: 'check-mismatch-1',
      },
      context,
    );

    expect(checked.CheckResult).toBe(PackageCheckResult.Mismatch);
    expect(checked.CheckExceptionCaseId).toBeTruthy();
    expect(harness.exceptionCases.cases[0]).toMatchObject({
      ExceptionType: 'CTRL-V1-PACK-CHECK-MISMATCH',
      State: ExceptionState.Detected,
      ReferenceType: 'PackSession',
    });
    expect(harness.packing.sessions[0].CheckPayloadJson).toMatchObject({
      CheckResult: PackageCheckResult.Mismatch,
      ObservedQuantity: 4,
    });
  });

  it('blocks re-checking as passed after mismatch until exception workflow resolves it', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-mismatch-lock',
      },
      context,
    );
    await harness.service.RecordCheck(
      session.Id,
      {
        CheckResult: PackageCheckResult.Mismatch,
        EvidenceRefs: ['scale:mismatch'],
        ObservedQuantity: 4,
        IdempotencyKey: 'check-mismatch-lock',
      },
      context,
    );

    await expect(
      harness.service.RecordCheck(
        session.Id,
        {
          CheckResult: PackageCheckResult.Passed,
          EvidenceRefs: ['scan:later-pass'],
          IdempotencyKey: 'check-pass-after-mismatch',
        },
        context,
      ),
    ).rejects.toThrow('Pack check exception must be resolved before re-checking as passed');
    expect(harness.packing.sessions[0].CheckResult).toBe(PackageCheckResult.Mismatch);
    expect(harness.packing.sessions[0].CheckExceptionCaseId).toBeTruthy();
  });

  it('creates, closes and marks a checked package ready for staging when label gate passes', async () => {
    const harness = makeHarness({ labelAllowed: true });
    const { pack } = await createPassedPackage(harness);

    const closed = await harness.service.ClosePackage(
      pack.Id,
      {
        EvidenceRefs: ['scale:ok'],
        IdempotencyKey: 'package-close-1',
      },
      context,
    );
    const ready = await harness.service.MarkReadyForStaging(
      pack.Id,
      {
        IdempotencyKey: 'ready-1',
        EvidenceRefs: ['print-job:print-job-1'],
      },
      context,
    );

    expect(closed.Status).toBe(PackageStatus.Packed);
    expect(closed.Contents[0]).toMatchObject({
      SkuId: 'sku-1',
      Quantity: 5,
      InventoryStatusCode: 'PICKED',
    });
    expect(ready.Package.Status).toBe(PackageStatus.ReadyForStaging);
    expect(ready.Package.LabelPrintJobId).toBe('print-job-1');
    expect(harness.labels.Execute).toHaveBeenCalledWith(
      expect.objectContaining({
        DownstreamAction: 'ready_for_staging',
        BusinessObjectType: 'Package',
        BusinessObjectId: pack.Id,
      }),
      context,
    );
  });

  it('blocks a second package for the same pick task even with a new idempotency key', async () => {
    const harness = makeHarness();
    const { session } = await createPassedPackage(harness);

    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-L',
          IdempotencyKey: 'package-create-second',
        },
        context,
      ),
    ).rejects.toThrow('Pick task already has a package');
  });

  it('returns controlled duplicate package when idempotency insert hits a DB unique race', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-package-race',
      },
      context,
    );
    await harness.service.RecordCheck(
      session.Id,
      {
        CheckResult: PackageCheckResult.Passed,
        EvidenceRefs: ['scan:check-pass'],
        IdempotencyKey: 'check-package-race',
      },
      context,
    );
    harness.packing.SimulatePackageUniqueConflictOnce = true;

    const pack = await harness.service.CreatePackage(
      {
        PackSessionId: session.Id,
        CartonType: 'CTN-S',
        IdempotencyKey: 'package-create-race',
      },
      context,
    );

    expect(pack.Id).toBe(harness.packing.packages[0].Id);
    expect(harness.packing.packages).toHaveLength(1);
  });

  it('rejects unsupported multi-content or mismatched pick task payloads for package content', async () => {
    const harness = makeHarness();
    const session = await harness.service.StartSession(
      {
        PickTaskId: 'pick-task-1',
        MobileTaskId: 'mobile-task-1',
        WarehouseProfileId: 'profile-1',
        IdempotencyKey: 'start-session-content-guard',
      },
      context,
    );
    await harness.service.RecordCheck(
      session.Id,
      {
        CheckResult: PackageCheckResult.Passed,
        EvidenceRefs: ['scan:check-pass'],
        IdempotencyKey: 'check-content-guard',
      },
      context,
    );

    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-S',
          Contents: [
            { PickTaskId: 'pick-task-1', Quantity: 2 },
            { PickTaskId: 'pick-task-1', Quantity: 3 },
          ],
          IdempotencyKey: 'package-content-multi',
        },
        context,
      ),
    ).rejects.toThrow('Only one package content row is supported for a pick task package');

    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-S',
          Contents: [{ PickTaskId: 'other-pick-task', Quantity: 2 }],
          IdempotencyKey: 'package-content-mismatch',
        },
        context,
      ),
    ).rejects.toThrow('Package content PickTaskId must match pack session pick task');
  });

  it('blocks ready for staging when required label evidence is missing and leaves package packed', async () => {
    const harness = makeHarness({ labelAllowed: false });
    const { pack } = await createPassedPackage(harness);
    await harness.service.ClosePackage(pack.Id, { IdempotencyKey: 'package-close-label-block' }, context);

    await expect(
      harness.service.MarkReadyForStaging(pack.Id, { IdempotencyKey: 'ready-label-block' }, context),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(harness.packing.packages[0].Status).toBe(PackageStatus.Packed);
    expect(harness.packing.packages[0].LabelBlockingDecision).toBeNull();
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ Result: AuditResult.Failed, ReferenceType: 'PackageGate' })]),
    );
  });

  it('detects ready-for-staging idempotency conflict after package is already ready', async () => {
    const harness = makeHarness({ labelAllowed: true });
    const { pack } = await createPassedPackage(harness);
    await harness.service.ClosePackage(pack.Id, { IdempotencyKey: 'package-close-ready-conflict' }, context);
    await harness.service.MarkReadyForStaging(
      pack.Id,
      {
        IdempotencyKey: 'ready-conflict',
        EvidenceRefs: ['label:original'],
        LabelType: 'SSCC',
      },
      context,
    );

    await expect(
      harness.service.MarkReadyForStaging(
        pack.Id,
        {
          IdempotencyKey: 'ready-conflict',
          EvidenceRefs: ['label:different'],
          LabelType: 'PACKAGE',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('detects idempotency conflict for same package create key with different payload', async () => {
    const harness = makeHarness();
    const { session } = await createPassedPackage(harness);

    await expect(
      harness.service.CreatePackage(
        {
          PackSessionId: session.Id,
          CartonType: 'CTN-L',
          IdempotencyKey: 'package-create-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies package mutation before creating session when Package permission rejects actor', async () => {
    const deniedChecker: IPermissionChecker = {
      Check: async (): Promise<PermissionDecision> => ({ Allowed: false, Reason: 'PERMISSION_DENIED' }),
    };
    const harness = makeHarness({ permissionChecker: deniedChecker });

    await expect(
      harness.service.StartSession(
        {
          PickTaskId: 'pick-task-1',
          MobileTaskId: 'mobile-task-1',
          WarehouseProfileId: 'profile-1',
          IdempotencyKey: 'start-session-denied',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenAppException);

    expect(harness.packing.sessions).toHaveLength(0);
  });

  it('rejects PageSize greater than 100 instead of silently widening the list', async () => {
    const harness = makeHarness();

    await expect(harness.service.List({ Page: 1, PageSize: 101 }, context.ActorUserId)).rejects.toThrow(
      'PageSize must not be greater than 100',
    );
  });
});

describe('Packing use case wrappers', () => {
  it('passes ready-for-staging calls through the lifecycle use case', async () => {
    const lifecycle = { MarkReadyForStaging: jest.fn(async () => ({ ok: true })) };
    const useCase = new MarkPackageReadyForStagingUseCase(lifecycle as never);

    await expect(useCase.Execute('package-1', { IdempotencyKey: 'ready' }, context)).resolves.toEqual({ ok: true });
    expect(lifecycle.MarkReadyForStaging).toHaveBeenCalledWith('package-1', { IdempotencyKey: 'ready' }, context);
  });
});
