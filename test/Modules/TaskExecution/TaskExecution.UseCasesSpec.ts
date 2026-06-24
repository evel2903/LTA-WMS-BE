import { ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ClaimMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ClaimMobileTaskUseCase';
import { GetMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/GetMobileTaskUseCase';
import { ListMobileTasksUseCase } from '@modules/TaskExecution/Application/UseCases/ListMobileTasksUseCase';
import { ReleaseMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ReleaseMobileTaskUseCase';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { EntityManager } from 'typeorm';

const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

const makeTask = (overrides: Partial<MobileTaskEntity> = {}) =>
  new MobileTaskEntity({
    Id: overrides.Id ?? 'task-a',
    TaskCode: overrides.TaskCode ?? 'MT-001',
    TaskType: overrides.TaskType ?? MobileTaskType.Putaway,
    TaskStatus: overrides.TaskStatus ?? MobileTaskStatus.Released,
    WarehouseId: overrides.WarehouseId ?? 'warehouse-a',
    WarehouseCode: overrides.WarehouseCode ?? 'WH-A',
    OwnerId: overrides.OwnerId ?? 'owner-a',
    OwnerCode: overrides.OwnerCode ?? 'OWN-A',
    SourceDocumentType: overrides.SourceDocumentType ?? 'PutawayTask',
    SourceDocumentId: overrides.SourceDocumentId ?? 'putaway-1',
    SourceDocumentCode: overrides.SourceDocumentCode ?? 'PUT-001',
    Priority: overrides.Priority ?? 10,
    AssignedUserId: overrides.AssignedUserId ?? null,
    ClaimedAt: overrides.ClaimedAt ?? null,
    ReleasedAt: overrides.ReleasedAt ?? null,
    DueAt: overrides.DueAt ?? null,
    DeviceCode: overrides.DeviceCode ?? null,
    SessionId: overrides.SessionId ?? null,
    TaskPayload: overrides.TaskPayload ?? { source: 'STAGE-01', target: 'A-01-01' },
    CreatedAt: overrides.CreatedAt ?? new Date('2026-06-22T08:00:00.000Z'),
    CreatedBy: overrides.CreatedBy ?? 'system',
    UpdatedAt: overrides.UpdatedAt ?? new Date('2026-06-22T08:00:00.000Z'),
    UpdatedBy: overrides.UpdatedBy ?? 'system',
  });

class FakeTaskRepository implements ITaskExecutionRepository {
  public tasks: MobileTaskEntity[];
  public filters: MobileTaskListFilter[] = [];

  constructor(tasks: MobileTaskEntity[]) {
    this.tasks = tasks;
  }

  public async FindCandidates(filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    this.filters.push(filter);
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

  public async FindScanEventsByTaskId(): Promise<MobileScanEventEntity[]> {
    return [];
  }

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) this.tasks[index] = task;
    else this.tasks.push(task);
    return task;
  }

  public async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work(undefined as unknown as EntityManager);
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public calls: Array<{ UserId: string; Action: ActionCode; ObjectType: ObjectType; WarehouseId?: string | null }> = [];

  constructor(private readonly allowedWarehouses: string[]) {}

  public async Check(context: {
    UserId: string;
    Action: ActionCode;
    ObjectType: ObjectType;
    Scope?: { WarehouseId?: string | null };
  }): Promise<PermissionDecision> {
    this.calls.push({
      UserId: context.UserId,
      Action: context.Action,
      ObjectType: context.ObjectType,
      WarehouseId: context.Scope?.WarehouseId,
    });
    if (context.Scope?.WarehouseId && !this.allowedWarehouses.includes(context.Scope.WarehouseId)) {
      return { Allowed: false, Reason: 'OUT_OF_SCOPE' };
    }
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

describe('TaskExecution use cases', () => {
  it('filters mobile task list by caller warehouse scope and clamps page size', async () => {
    const repo = new FakeTaskRepository([
      makeTask({ Id: 'task-a', WarehouseId: 'warehouse-a', TaskCode: 'MT-A' }),
      makeTask({ Id: 'task-b', WarehouseId: 'warehouse-b', TaskCode: 'MT-B' }),
    ]);
    const permission = new FakePermissionChecker(['warehouse-a']);

    const result = await new ListMobileTasksUseCase(repo, permission).Execute({
      ActorUserId: 'operator-1',
      PageSize: 500,
    });

    expect(result.Items.map((task) => task.Id)).toEqual(['task-a']);
    expect(result.Meta.PageSize).toBe(100);
    expect(permission.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Action: ActionCode.Read,
          ObjectType: ObjectType.MobileTask,
          WarehouseId: 'warehouse-a',
        }),
        expect.objectContaining({
          Action: ActionCode.Read,
          ObjectType: ObjectType.MobileTask,
          WarehouseId: 'warehouse-b',
        }),
      ]),
    );
  });

  it('claims and releases an in-scope mobile task with audit evidence', async () => {
    const repo = new FakeTaskRepository([makeTask({ Id: 'task-a' })]);
    const permission = new FakePermissionChecker(['warehouse-a']);
    const audited = new FakeAuditedTransaction();

    const claimed = await new ClaimMobileTaskUseCase(
      repo,
      permission,
      audited as unknown as AuditedTransaction,
    ).Execute({ Id: 'task-a', DeviceCode: 'RF-01', SessionId: 'session-1' }, contextFor('operator-1'));

    expect(claimed.TaskStatus).toBe(MobileTaskStatus.Claimed);
    expect(claimed.AssignedUserId).toBe('operator-1');
    expect(audited.entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ObjectId: 'task-a',
      WarehouseId: 'warehouse-a',
      Result: AuditResult.Success,
    });

    const released = await new ReleaseMobileTaskUseCase(
      repo,
      permission,
      audited as unknown as AuditedTransaction,
    ).Execute({ Id: 'task-a' }, contextFor('operator-1'));

    expect(released.TaskStatus).toBe(MobileTaskStatus.Released);
    expect(released.AssignedUserId).toBeNull();
    expect(audited.entries[1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ObjectId: 'task-a',
      Result: AuditResult.Success,
    });
  });

  it('refreshes claim timestamp when a previously released task is claimed again', async () => {
    const repo = new FakeTaskRepository([
      makeTask({
        Id: 'task-a',
        ClaimedAt: new Date('2026-06-22T08:05:00.000Z'),
        ReleasedAt: new Date('2026-06-22T08:10:00.000Z'),
      }),
    ]);
    const permission = new FakePermissionChecker(['warehouse-a']);
    const audited = new FakeAuditedTransaction();

    const claimed = await new ClaimMobileTaskUseCase(
      repo,
      permission,
      audited as unknown as AuditedTransaction,
    ).Execute({ Id: 'task-a' }, contextFor('operator-1'));

    expect(claimed.TaskStatus).toBe(MobileTaskStatus.Claimed);
    expect(claimed.ClaimedAt).not.toBe('2026-06-22T08:05:00.000Z');
  });

  it('rejects claim and release from invalid task statuses', async () => {
    const permission = new FakePermissionChecker(['warehouse-a']);

    await expect(
      new ClaimMobileTaskUseCase(
        new FakeTaskRepository([makeTask({ Id: 'task-a', TaskStatus: MobileTaskStatus.InProgress })]),
        permission,
        new FakeAuditedTransaction() as unknown as AuditedTransaction,
      ).Execute({ Id: 'task-a' }, contextFor('operator-1')),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      new ReleaseMobileTaskUseCase(
        new FakeTaskRepository([
          makeTask({
            Id: 'task-b',
            TaskStatus: MobileTaskStatus.Completed,
            AssignedUserId: 'operator-1',
          }),
        ]),
        permission,
        new FakeAuditedTransaction() as unknown as AuditedTransaction,
      ).Execute({ Id: 'task-b' }, contextFor('operator-1')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies duplicate claim, records blocked audit and preserves existing claimant', async () => {
    const repo = new FakeTaskRepository([
      makeTask({
        Id: 'task-a',
        TaskStatus: MobileTaskStatus.Claimed,
        AssignedUserId: 'operator-1',
        ClaimedAt: new Date('2026-06-22T08:05:00.000Z'),
      }),
    ]);
    const permission = new FakePermissionChecker(['warehouse-a']);
    const audited = new FakeAuditedTransaction();

    await expect(
      new ClaimMobileTaskUseCase(repo, permission, audited as unknown as AuditedTransaction).Execute(
        { Id: 'task-a' },
        contextFor('operator-2'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.tasks[0].AssignedUserId).toBe('operator-1');
    expect(audited.entries).toHaveLength(1);
    expect(audited.entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ObjectId: 'task-a',
      ObjectCode: 'CLAIM_DENIED',
      Result: AuditResult.Blocked,
    });
  });

  it('denies detail and release when entity-resident warehouse scope is not allowed', async () => {
    const repo = new FakeTaskRepository([
      makeTask({ Id: 'task-b', WarehouseId: 'warehouse-b', AssignedUserId: 'operator-1' }),
    ]);
    const permission = new FakePermissionChecker(['warehouse-a']);
    const audited = new FakeAuditedTransaction();

    await expect(new GetMobileTaskUseCase(repo, permission).Execute('task-b', 'operator-1')).rejects.toBeInstanceOf(
      ForbiddenAppException,
    );

    await expect(
      new ReleaseMobileTaskUseCase(repo, permission, audited as unknown as AuditedTransaction).Execute(
        { Id: 'task-b' },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
  });
});
