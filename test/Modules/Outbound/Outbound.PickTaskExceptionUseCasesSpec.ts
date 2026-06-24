import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { EntityManager } from 'typeorm';
import { ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickTaskExceptionService } from '@modules/Outbound/Application/Services/PickTaskExceptionService';
import {
  ReportPickExceptionUseCase,
  RequestPickSubstitutionUseCase,
} from '@modules/Outbound/Application/UseCases/PickTaskExceptionUseCases';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { PickSubstitutionStatus } from '@modules/Outbound/Domain/Enums/PickSubstitutionStatus';
import {
  MobilePickTaskController,
  PickTaskController,
} from '@modules/Outbound/Presentation/Controllers/PickTaskController';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
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
  UserAgent: 'vitest',
};

function makePickTask(overrides: Partial<PickTaskEntity> = {}): PickTaskEntity {
  return new PickTaskEntity({
    Id: 'pick-task-1',
    PickReleaseId: 'pick-release-1',
    OutboundOrderId: 'outbound-order-1',
    AllocationId: 'allocation-1',
    AllocationLineId: 'allocation-line-1',
    OutboundOrderLineId: 'outbound-line-1',
    TaskNumber: 'PICK-001',
    Status: PickTaskStatus.Released,
    Sequence: 1,
    SourceBalanceId: 'balance-1',
    SourceDimensionId: 'dimension-1',
    SourceLocationId: 'loc-source',
    SkuId: 'sku-1',
    SkuCode: 'SKU-1',
    UomId: 'uom-1',
    UomCode: 'EA',
    Quantity: 5,
    InventoryStatusCode: 'AVAILABLE',
    CreatedAt: now,
    ...overrides,
  });
}

function makeMobileTask(overrides: Partial<MobileTaskEntity> = {}): MobileTaskEntity {
  return new MobileTaskEntity({
    Id: 'mobile-task-1',
    TaskCode: 'MT-PICK-001',
    TaskType: MobileTaskType.Pick,
    TaskStatus: MobileTaskStatus.Claimed,
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    SourceDocumentType: 'PickTask',
    SourceDocumentId: 'pick-task-1',
    SourceDocumentCode: 'PICK-001',
    Priority: 1,
    AssignedUserId: 'picker-1',
    ClaimedAt: now,
    TaskPayload: { PickTaskId: 'pick-task-1', SkuId: 'sku-1', Quantity: 5 },
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

class MemoryPickReleaseRepository implements IPickReleaseRepository {
  constructor(public task = makePickTask()) {}

  async Create(release: PickReleaseEntity, tasks: PickTaskEntity[]): Promise<PickReleaseAggregate> {
    return { Release: release, Tasks: tasks };
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
    return this.task;
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
  public scans: MobileScanEventEntity[] = [];

  constructor(public task = makeMobileTask()) {}

  async FindCandidates(_filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    void _filter;
    return [this.task];
  }

  async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.task.Id === id ? this.task : null;
  }

  async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  async FindBySourceDocument(type: string, id: string): Promise<MobileTaskEntity | null> {
    return this.task.SourceDocumentType === type && this.task.SourceDocumentId === id ? this.task : null;
  }

  async FindScanEventsByTaskId(): Promise<MobileScanEventEntity[]> {
    return this.scans;
  }

  async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.task = task;
    return this.task;
  }

  async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    this.scans.push(scan);
    return scan;
  }

  async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work({} as EntityManager);
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

class MemoryApprovalRequestRepository implements IApprovalRequestRepository {
  public approvals: ApprovalRequestEntity[] = [];

  async FindById(id: string): Promise<ApprovalRequestEntity | null> {
    return this.approvals.find((item) => item.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<ApprovalRequestEntity | null> {
    return this.FindById(id);
  }

  async Create(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.approvals.push(request);
    return request;
  }

  async Update(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.approvals = this.approvals.map((item) => (item.Id === request.Id ? request : item));
    return request;
  }

  async List(): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }> {
    return { Items: this.approvals, TotalItems: this.approvals.length };
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

const controlExceptionCatalog: IControlExceptionCatalog = {
  FindByCode: async (code) => makeControlException(code),
  List: async () => [],
  ValidateExceptionType: async (code) => makeControlException(code),
};

const reasonCatalog: IReasonCodeCatalog = {
  ValidateReason: async (input) => ({
    ReasonCodeId: `reason-${input.ReasonCode}`,
    EvidenceRequired: input.ReasonCode === 'RC-V1-DISCREPANCY',
    ApprovalRequired: false,
  }),
};

const permissionChecker: IPermissionChecker = {
  Check: async (): Promise<PermissionDecision> => ({ Allowed: true }),
};

function makeControlException(code: string): ControlExceptionCatalogEntity {
  return new ControlExceptionCatalogEntity({
    Id: `catalog-${code}`,
    Code: code,
    Scenario: code,
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: code.includes('SUBSTITUTION'),
    OwnerRoles: ['WAREHOUSE_SUPERVISOR'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
    SourceDocRef: 'test',
    CreatedAt: now,
    UpdatedAt: now,
  });
}

function makeApprovalUseCase(repo: MemoryApprovalRequestRepository): CreateApprovalRequestUseCase {
  return {
    Execute: async (request, ctx) => {
      const audit = ctx ?? context;
      const entity = new ApprovalRequestEntity({
        Id: 'approval-1',
        RequesterUserId: audit.ActorUserId ?? 'picker-1',
        Action: request.Action,
        TargetObjectType: request.TargetObjectType,
        TargetObjectId: request.TargetObjectId,
        TargetObjectCode: request.TargetObjectCode ?? null,
        RequestReasonNote: request.ReasonNote ?? null,
        EvidenceRefs: request.EvidenceRefs ?? null,
        Decision: ApprovalDecision.Pending,
        ReferenceType: request.ReferenceType ?? null,
        ReferenceId: request.ReferenceId ?? null,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: audit.ActorUserId,
      });
      return {
        Id: (await repo.Create(entity)).Id,
        RequesterUserId: entity.RequesterUserId,
        Action: entity.Action,
        TargetObjectType: entity.TargetObjectType,
        TargetObjectId: entity.TargetObjectId,
        TargetObjectCode: entity.TargetObjectCode,
        Scope: entity.Scope,
        RequestReasonCodeId: entity.RequestReasonCodeId,
        RequestReasonNote: entity.RequestReasonNote,
        EvidenceRefs: entity.EvidenceRefs,
        Decision: entity.Decision,
        DecidedByUserId: null,
        DecisionReasonCodeId: null,
        DecisionNote: null,
        DecidedAt: null,
        ReferenceType: entity.ReferenceType,
        ReferenceId: entity.ReferenceId,
        CreatedAt: entity.CreatedAt,
        UpdatedAt: entity.UpdatedAt,
      };
    },
  } as CreateApprovalRequestUseCase;
}

function makeService(overrides: Partial<{ replenishment: unknown; permissionChecker: IPermissionChecker }> = {}) {
  const pickReleases = new MemoryPickReleaseRepository();
  const taskExecution = new MemoryTaskExecutionRepository();
  const exceptionCases = new MemoryExceptionCaseRepository();
  const approvalRequests = new MemoryApprovalRequestRepository();
  const audited = new MemoryAuditedTransaction();
  const replenishment =
    overrides.replenishment ??
    ({
      Execute: async (request: { TriggerType: ReplenishmentTriggerType }) => ({
        ReplenishmentTask: {
          Id: 'replenishment-1',
          TriggerType: request.TriggerType,
        },
      }),
    } as unknown);
  const service = new PickTaskExceptionService(
    pickReleases,
    taskExecution,
    exceptionCases,
    controlExceptionCatalog,
    reasonCatalog,
    audited as never,
    approvalRequests,
    makeApprovalUseCase(approvalRequests),
    replenishment as never,
    overrides.permissionChecker ?? permissionChecker,
  );
  return {
    service,
    pickReleases,
    taskExecution,
    exceptionCases,
    approvalRequests,
    audited,
    report: new ReportPickExceptionUseCase(service),
    substitution: new RequestPickSubstitutionUseCase(service),
  };
}

describe('PickTaskExceptionService', () => {
  it('records short pick exception, blocks the mobile task and links emergency replenishment', async () => {
    const harness = makeService();

    const result = await harness.report.ExecuteByMobileTask(
      'mobile-task-1',
      {
        ExceptionType: 'ShortPick',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:short-pick'],
        ObservedQuantity: 2,
        ReplenishmentTargetLocationId: 'loc-pick-face',
        IdempotencyKey: 'pick-exception-1',
      },
      context,
    );

    expect(result.ExceptionCase?.ExceptionType).toBe('CTRL-V1-PICK-EXCEPTION');
    expect(result.ReplenishmentRequired).toBe(true);
    expect(result.ReplenishmentTask?.Id).toBe('replenishment-1');
    expect(harness.taskExecution.task.TaskStatus).toBe(MobileTaskStatus.Blocked);
    expect(harness.pickReleases.task.ExceptionCaseId).toBe(result.ExceptionCase?.Id);
    expect(harness.pickReleases.task.ReplenishmentTaskId).toBe('replenishment-1');
    expect(harness.audited.entries.some((entry) => entry.ObjectType === ObjectType.ExceptionCase)).toBe(true);
    expect(harness.audited.entries.some((entry) => entry.ReferenceType === 'PickReplenishmentLink')).toBe(true);
  });

  it('returns duplicate result for same exception idempotency key and payload', async () => {
    const harness = makeService();

    await harness.report.ExecuteByMobileTask(
      'mobile-task-1',
      {
        ExceptionType: 'NoStock',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:no-stock'],
        IdempotencyKey: 'pick-exception-dup',
      },
      context,
    );
    const duplicate = await harness.report.ExecuteByMobileTask(
      'mobile-task-1',
      {
        ExceptionType: 'NoStock',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:no-stock'],
        IdempotencyKey: 'pick-exception-dup',
      },
      context,
    );

    expect(duplicate.IsDuplicate).toBe(true);
    expect(harness.exceptionCases.cases).toHaveLength(1);
  });

  it('rejects same exception idempotency key with different payload', async () => {
    const harness = makeService();

    await harness.report.ExecuteByMobileTask(
      'mobile-task-1',
      {
        ExceptionType: 'NoStock',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:no-stock'],
        IdempotencyKey: 'pick-exception-conflict',
      },
      context,
    );

    await expect(
      harness.report.ExecuteByMobileTask(
        'mobile-task-1',
        {
          ExceptionType: 'NoStock',
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['scan:no-stock-different'],
          IdempotencyKey: 'pick-exception-conflict',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(harness.exceptionCases.cases).toHaveLength(1);
  });

  it.each(['Damaged', 'WrongItem'])('records %s pick exception without inventory status mutation', async (type) => {
    const harness = makeService();

    const result = await harness.report.ExecuteByMobileTask(
      'mobile-task-1',
      {
        ExceptionType: type,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: [`scan:${type}`],
        DamagedQuantity: type === 'Damaged' ? 1 : undefined,
        ObservedSkuId: type === 'WrongItem' ? 'sku-wrong' : undefined,
        IdempotencyKey: `pick-exception-${type}`,
      },
      context,
    );

    expect(result.ExceptionCase?.ExceptionType).toBe('CTRL-V1-PICK-EXCEPTION');
    expect(result.ReplenishmentRequired).toBe(false);
    expect(result.ReplenishmentTask).toBeNull();
    expect(result.PickTask.InventoryStatusCode).toBe('AVAILABLE');
    expect(harness.taskExecution.task.TaskStatus).toBe(MobileTaskStatus.Blocked);
  });

  it('denies exception mutation when pick/mobile permissions reject the actor', async () => {
    const deniedChecker: IPermissionChecker = {
      Check: async (): Promise<PermissionDecision> => ({ Allowed: false, Reason: 'PERMISSION_DENIED' }),
    };
    const harness = makeService({ permissionChecker: deniedChecker });

    await expect(
      harness.report.ExecuteByMobileTask(
        'mobile-task-1',
        {
          ExceptionType: 'ShortPick',
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['scan:denied'],
          IdempotencyKey: 'pick-exception-denied',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
    expect(harness.exceptionCases.cases).toHaveLength(0);
  });

  it('rejects disallowed substitution without mutating pick task substitution state', async () => {
    const harness = makeService();

    const result = await harness.substitution.ExecuteByMobileTask(
      'mobile-task-1',
      {
        SubstituteSkuId: 'sku-sub',
        Quantity: 1,
        PolicyDecision: 'Disallow',
        PolicyReason: 'customer blocks substitute',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:wrong-item'],
        IdempotencyKey: 'pick-substitution-reject',
      },
      context,
    );

    expect(result.SubstitutionStatus).toBe(PickSubstitutionStatus.Rejected);
    expect(harness.pickReleases.task.SubstitutionStatus).toBeNull();
    expect(harness.audited.entries[harness.audited.entries.length - 1]?.Result).toBe(AuditResult.Failed);
  });

  it('routes substitution to approval and blocks the mobile task when policy requires approval', async () => {
    const harness = makeService();

    const result = await harness.substitution.ExecuteByMobileTask(
      'mobile-task-1',
      {
        SubstituteSkuId: 'sku-sub',
        SubstituteSkuCode: 'SKU-SUB',
        Quantity: 1,
        PolicyDecision: 'RequireApproval',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:wrong-item'],
        IdempotencyKey: 'pick-substitution-approval',
      },
      context,
    );

    expect(result.SubstitutionStatus).toBe(PickSubstitutionStatus.PendingApproval);
    expect(result.ApprovalRequest?.Id).toBe('approval-1');
    expect(harness.pickReleases.task.SubstitutionApprovalRequestId).toBe('approval-1');
    expect(harness.taskExecution.task.TaskStatus).toBe(MobileTaskStatus.Blocked);
  });

  it('auto-applies allowed substitution context without creating an approval request', async () => {
    const harness = makeService();

    const result = await harness.substitution.ExecuteByMobileTask(
      'mobile-task-1',
      {
        SubstituteSkuId: 'sku-sub',
        SubstituteSkuCode: 'SKU-SUB',
        SubstituteUomId: 'uom-sub',
        SubstituteUomCode: 'EA',
        Quantity: 2,
        PolicyDecision: 'Allow',
        PolicyReason: 'warehouse substitute policy allows SKU-SUB',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['scan:wrong-item'],
        IdempotencyKey: 'pick-substitution-auto',
      },
      context,
    );

    expect(result.SubstitutionStatus).toBe(PickSubstitutionStatus.AutoApplied);
    expect(result.ApprovalRequest).toBeNull();
    expect(harness.pickReleases.task.SubstitutionSkuId).toBe('sku-sub');
    expect(harness.pickReleases.task.SubstitutionQuantity).toBe(2);
    expect(harness.taskExecution.task.TaskStatus).toBe(MobileTaskStatus.Claimed);
    expect(harness.audited.entries.some((entry) => entry.ReferenceType === 'PickSubstitution')).toBe(true);
  });
});

describe('Pick task exception controllers', () => {
  it('exposes exception and substitution endpoints with existing update permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PickTaskController.prototype.ReportException)).toBe(':id/exceptions');
    expect(Reflect.getMetadata(METHOD_METADATA, PickTaskController.prototype.ReportException)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PickTaskController.prototype.ReportException)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
      Scope: undefined,
    });

    expect(Reflect.getMetadata(PATH_METADATA, MobilePickTaskController.prototype.ReportException)).toBe(
      ':id/exceptions',
    );
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, MobilePickTaskController.prototype.RequestSubstitution)).toEqual(
      {
        Action: ActionCode.Update,
        ObjectType: ObjectType.MobileTask,
        Scope: undefined,
      },
    );
  });
});
