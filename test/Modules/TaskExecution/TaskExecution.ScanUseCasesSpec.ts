import { BusinessRuleException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { RecordMobileScanUseCase } from '@modules/TaskExecution/Application/UseCases/RecordMobileScanUseCase';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { EntityManager } from 'typeorm';

const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });
const Now = new Date('2026-06-22T08:00:00.000Z');

const makeTask = (overrides: Partial<MobileTaskEntity> = {}) =>
  new MobileTaskEntity({
    Id: overrides.Id ?? 'task-a',
    TaskCode: overrides.TaskCode ?? 'MT-001',
    TaskType: overrides.TaskType ?? MobileTaskType.Putaway,
    TaskStatus: overrides.TaskStatus ?? MobileTaskStatus.Claimed,
    WarehouseId: overrides.WarehouseId ?? 'warehouse-a',
    WarehouseCode: overrides.WarehouseCode ?? 'WH-A',
    OwnerId: overrides.OwnerId ?? 'owner-a',
    OwnerCode: overrides.OwnerCode ?? 'OWN-A',
    SourceDocumentType: overrides.SourceDocumentType ?? 'PutawayTask',
    SourceDocumentId: overrides.SourceDocumentId ?? 'putaway-1',
    SourceDocumentCode: overrides.SourceDocumentCode ?? 'PUT-001',
    Priority: overrides.Priority ?? 10,
    AssignedUserId: overrides.AssignedUserId ?? 'operator-1',
    ClaimedAt: overrides.ClaimedAt ?? Now,
    ReleasedAt: overrides.ReleasedAt ?? null,
    DueAt: overrides.DueAt ?? null,
    DeviceCode: overrides.DeviceCode ?? null,
    SessionId: overrides.SessionId ?? null,
    TaskPayload: overrides.TaskPayload ?? { ScanPolicy: { MandatoryScanTypes: ['Item'], AllowManualOverride: true } },
    CreatedAt: overrides.CreatedAt ?? Now,
    CreatedBy: overrides.CreatedBy ?? 'system',
    UpdatedAt: overrides.UpdatedAt ?? Now,
    UpdatedBy: overrides.UpdatedBy ?? 'system',
  });

const makeBarcode = (overrides: Partial<SkuBarcodeEntity> = {}) =>
  new SkuBarcodeEntity({
    Id: overrides.Id ?? 'barcode-1',
    SkuId: overrides.SkuId ?? 'sku-1',
    OwnerId: overrides.OwnerId === undefined ? 'owner-a' : overrides.OwnerId,
    UomId: overrides.UomId ?? 'uom-ea',
    PackCode: overrides.PackCode ?? 'CASE',
    BarcodeValue: overrides.BarcodeValue ?? '09506000134352',
    BarcodeType: overrides.BarcodeType ?? 'GS1',
    IsPrimary: overrides.IsPrimary ?? true,
    Status: overrides.Status ?? MasterDataStatus.Active,
    EffectiveFrom: overrides.EffectiveFrom ?? new Date('2026-01-01T00:00:00.000Z'),
    EffectiveTo: overrides.EffectiveTo === undefined ? null : overrides.EffectiveTo,
    CreatedAt: overrides.CreatedAt ?? Now,
    UpdatedAt: overrides.UpdatedAt ?? Now,
  });

class FakeTaskRepository implements Partial<ITaskExecutionRepository> {
  public tasks: MobileTaskEntity[];
  public scans: MobileScanEventEntity[] = [];
  public mutateBeforeLock?: (task: MobileTaskEntity) => void;

  constructor(tasks: MobileTaskEntity[]) {
    this.tasks = tasks;
  }

  public async FindCandidates(_filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    void _filter;
    return this.tasks;
  }

  public async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.tasks.find((task) => task.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    const task = this.tasks.find((item) => item.Id === id) ?? null;
    if (task && this.mutateBeforeLock) {
      this.mutateBeforeLock(task);
      this.mutateBeforeLock = undefined;
    }
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
    return this.scans.filter((scan) => scan.TaskId === taskId);
  }

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) this.tasks[index] = task;
    return task;
  }

  public async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    this.scans.push(scan);
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work(undefined as unknown as EntityManager);
  }
}

class FakeSkuBarcodeRepository implements Partial<ISkuBarcodeRepository> {
  public candidates: SkuBarcodeEntity[] = [];

  public async FindCandidatesByValue(barcodeValue: string): Promise<SkuBarcodeEntity[]> {
    return this.candidates.filter((barcode) => barcode.BarcodeValue === barcodeValue);
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public async Check(context: {
    UserId: string;
    Action: ActionCode;
    ObjectType: ObjectType;
    Scope?: { WarehouseId?: string | null };
  }): Promise<PermissionDecision> {
    if (context.Scope?.WarehouseId === 'warehouse-denied') {
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

class FakeReasonCatalog implements IReasonCodeCatalog {
  public calls: Array<{ ReasonCode: string; Action: ActionCode; ObjectType: ObjectType }> = [];

  public async ValidateReason(input: { ReasonCode: string; Action: ActionCode; ObjectType: ObjectType }) {
    this.calls.push(input);
    return { ReasonCodeId: `id-${input.ReasonCode}`, EvidenceRequired: true, ApprovalRequired: false };
  }
}

const buildUseCase = (input?: { task?: MobileTaskEntity; barcodes?: SkuBarcodeEntity[] }) => {
  const tasks = new FakeTaskRepository([input?.task ?? makeTask()]);
  const barcodes = new FakeSkuBarcodeRepository();
  barcodes.candidates = input?.barcodes ?? [makeBarcode()];
  const audited = new FakeAuditedTransaction();
  const reasonCatalog = new FakeReasonCatalog();
  const useCase = new RecordMobileScanUseCase(
    tasks as ITaskExecutionRepository,
    barcodes as unknown as ISkuBarcodeRepository,
    new FakePermissionChecker(),
    audited as unknown as AuditedTransaction,
    reasonCatalog,
  );
  return { tasks, barcodes, audited, reasonCatalog, useCase };
};

describe('RecordMobileScanUseCase', () => {
  it('records an accepted GS1 item scan with parsed lot, expiry, serial and quantity', async () => {
    const { tasks, useCase } = buildUseCase();

    const result = await useCase.Execute(
      {
        TaskId: 'task-a',
        ScanType: MobileScanType.Item,
        RawValue: '(01)09506000134352(10)LOT123(17)260630(21)SN01(30)12',
      },
      contextFor('operator-1'),
    );

    expect(result.Result).toBe(MobileScanResult.Accepted);
    expect(result.ResolvedObjectType).toBe('SKU');
    expect(result.ResolvedObjectId).toBe('sku-1');
    expect(result.ParsedValueJson).toMatchObject({
      Gtin: '09506000134352',
      Lot: 'LOT123',
      ExpiryDate: '2026-06-30',
      Serial: 'SN01',
      Quantity: 12,
    });
    expect(tasks.scans).toHaveLength(1);
  });

  it('rejects invalid GS1 quantity without writing NaN into scan evidence', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '(01)09506000134352(30)ABC' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({
      Result: MobileScanResult.Rejected,
      RejectionCode: 'INVALID_GS1_QUANTITY',
      ParsedValueJson: { InvalidFields: ['Quantity'] },
    });
  });

  it('rejects unresolved, ambiguous and expired aliases without mutating the task', async () => {
    const unresolved = buildUseCase({ barcodes: [] });
    await expect(
      unresolved.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: 'missing' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'UNRESOLVED_BARCODE' });
    expect(unresolved.tasks.tasks[0].TaskStatus).toBe(MobileTaskStatus.Claimed);

    const ambiguous = buildUseCase({
      barcodes: [makeBarcode({ Id: 'barcode-a' }), makeBarcode({ Id: 'barcode-b' })],
    });
    await expect(
      ambiguous.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'AMBIGUOUS_BARCODE' });

    const expired = buildUseCase({
      barcodes: [makeBarcode({ EffectiveTo: new Date('2026-01-31T00:00:00.000Z') })],
    });
    await expect(
      expired.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'ALIAS_EXPIRED' });

    const inactive = buildUseCase({ barcodes: [makeBarcode({ Status: MasterDataStatus.Inactive })] });
    await expect(
      inactive.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'ALIAS_INACTIVE' });

    const future = buildUseCase({
      barcodes: [makeBarcode({ EffectiveFrom: new Date('2026-12-31T00:00:00.000Z') })],
    });
    await expect(
      future.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'ALIAS_NOT_EFFECTIVE' });

    const wrongOwner = buildUseCase({ barcodes: [makeBarcode({ OwnerId: 'owner-b' })] });
    await expect(
      wrongOwner.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'OWNER_SCOPE_MISMATCH' });
  });

  it('prefers owner-scoped barcode aliases over global aliases', async () => {
    const { useCase } = buildUseCase({
      barcodes: [
        makeBarcode({ Id: 'barcode-global', OwnerId: null, SkuId: 'sku-global' }),
        makeBarcode({ Id: 'barcode-owner', OwnerId: 'owner-a', SkuId: 'sku-owner' }),
      ],
    });

    await expect(
      useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({
      Result: MobileScanResult.Accepted,
      ResolvedObjectType: 'SKU',
      ResolvedObjectId: 'sku-owner',
    });
  });

  it('requires reason and writes audit evidence for mandatory manual scan override', async () => {
    const rejected = buildUseCase();
    await expect(
      rejected.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: 'typed-sku', ManualEntry: true },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.Rejected, RejectionCode: 'REASON_REQUIRED' });
    expect(rejected.audited.entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ObjectId: 'task-a',
      Result: AuditResult.Blocked,
    });

    const accepted = buildUseCase();
    const result = await accepted.useCase.Execute(
      {
        TaskId: 'task-a',
        ScanType: MobileScanType.Item,
        RawValue: 'typed-sku',
        ManualEntry: true,
        ReasonCode: 'RC-V1-OVERRIDE',
      },
      contextFor('operator-1'),
    );

    expect(result.Result).toBe(MobileScanResult.ManualOverrideAccepted);
    expect(accepted.reasonCatalog.calls[0]).toEqual({
      ReasonCode: 'RC-V1-OVERRIDE',
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
    });
    expect(accepted.audited.entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ReasonCodeId: 'id-RC-V1-OVERRIDE',
      Result: AuditResult.Success,
    });
  });

  it('ignores malformed scan policy payloads instead of applying mandatory override accidentally', async () => {
    const malformedPolicyTask = makeTask({
      TaskPayload: { ScanPolicy: { MandatoryScanTypes: 'Item', AllowManualOverride: 'yes' } },
    });
    const { useCase } = buildUseCase({ task: malformedPolicyTask });

    await expect(
      useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: 'typed-sku', ManualEntry: true },
        contextFor('operator-1'),
      ),
    ).resolves.toMatchObject({ Result: MobileScanResult.ManualOverrideAccepted });
  });

  it('rechecks terminal task status under the scan transaction lock before saving evidence', async () => {
    const setup = buildUseCase();
    setup.tasks.mutateBeforeLock = (task) => {
      task.TaskStatus = MobileTaskStatus.Completed;
    };

    await expect(
      setup.useCase.Execute(
        { TaskId: 'task-a', ScanType: MobileScanType.Item, RawValue: '09506000134352' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow(BusinessRuleException);
    expect(setup.tasks.scans).toHaveLength(0);
  });

  it('rejects invalid effective window on SKU barcode alias creation', () => {
    expect(
      () =>
        new SkuBarcodeEntity({
          Id: 'barcode-1',
          SkuId: 'sku-1',
          UomId: 'uom-ea',
          BarcodeValue: '123',
          BarcodeType: 'EAN13',
          Status: MasterDataStatus.Active,
          EffectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
          EffectiveTo: new Date('2026-06-01T00:00:00.000Z'),
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
    ).toThrow(BusinessRuleException);
  });
});
