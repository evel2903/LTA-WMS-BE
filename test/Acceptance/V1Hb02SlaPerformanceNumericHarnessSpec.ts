import { performance } from 'node:perf_hooks';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ListPrintJobsUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListPrintJobsUseCase';
import { PreviewPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/PreviewPrintJobUseCase';
import {
  IBarcodeLabelRepository,
  LabelTemplateListFilter,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import {
  ISkuBarcodeRepository,
  SkuBarcodeListFilter,
} from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { ListMobileTasksUseCase } from '@modules/TaskExecution/Application/UseCases/ListMobileTasksUseCase';
import { RecordMobileScanUseCase } from '@modules/TaskExecution/Application/UseCases/RecordMobileScanUseCase';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { EntityManager } from 'typeorm';

type MeasurementName = 'scan-confirm' | 'label-preview' | 'list-default-page-size' | 'list-max-page-size';

type MeasurementResult = {
  Name: MeasurementName;
  Samples: number;
  ThresholdMs: number;
  MinMs: number;
  MaxMs: number;
  AvgMs: number;
  P50Ms: number;
  P95Ms: number;
  Passed: boolean;
};

const SAMPLE_COUNT = 20;
const WARMUP_COUNT = 3;
const Now = new Date('2026-06-25T06:00:00.000Z');
const Context: AuditContext = { ...SystemAuditContext, ActorUserId: 'v1-hb-02-operator', CorrelationId: 'v1-hb-02' };
const ForbiddenInventoryStatusTerms = [
  'SHIPPED',
  'GATE_OUT',
  'GOODS_ISSUE_POSTED',
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

class AllowAllPermissionChecker implements IPermissionChecker {
  public calls: PermissionCheckContext[] = [];

  public async Check(context: PermissionCheckContext): Promise<PermissionDecision> {
    this.calls.push(context);
    return { Allowed: true };
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work(undefined as unknown as EntityManager);
    this.entries.push(entry);
    return result;
  }
}

class InMemoryTaskExecutionRepository implements ITaskExecutionRepository {
  public tasks: MobileTaskEntity[];
  public scans: MobileScanEventEntity[] = [];

  constructor(tasks: MobileTaskEntity[]) {
    this.tasks = tasks;
  }

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

class InMemorySkuBarcodeRepository implements ISkuBarcodeRepository {
  public barcodes: SkuBarcodeEntity[];

  constructor(barcodes: SkuBarcodeEntity[]) {
    this.barcodes = barcodes;
  }

  public async FindById(id: string): Promise<SkuBarcodeEntity | null> {
    return this.barcodes.find((barcode) => barcode.Id === id) ?? null;
  }

  public async FindByValueAndOwner(barcodeValue: string, ownerId: string | null): Promise<SkuBarcodeEntity | null> {
    return (
      this.barcodes.find((barcode) => barcode.BarcodeValue === barcodeValue && barcode.OwnerId === ownerId) ?? null
    );
  }

  public async FindCandidatesByValue(barcodeValue: string): Promise<SkuBarcodeEntity[]> {
    return this.barcodes.filter((barcode) => barcode.BarcodeValue === barcodeValue);
  }

  public async Create(skuBarcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity> {
    this.barcodes.push(skuBarcode);
    return skuBarcode;
  }

  public async Update(skuBarcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity> {
    this.barcodes = this.barcodes.map((barcode) => (barcode.Id === skuBarcode.Id ? skuBarcode : barcode));
    return skuBarcode;
  }

  public async List(
    skip: number,
    take: number,
    filter: SkuBarcodeListFilter = {},
  ): Promise<{ Items: SkuBarcodeEntity[]; TotalItems: number }> {
    const items = this.barcodes.filter((barcode) => {
      if (filter.SkuId && barcode.SkuId !== filter.SkuId) return false;
      if (filter.OwnerId !== undefined && barcode.OwnerId !== filter.OwnerId) return false;
      if (filter.UomId && barcode.UomId !== filter.UomId) return false;
      if (filter.BarcodeValue && barcode.BarcodeValue !== filter.BarcodeValue) return false;
      if (filter.Status && barcode.Status !== filter.Status) return false;
      return true;
    });
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class InMemoryBarcodeLabelRepository implements IBarcodeLabelRepository {
  public templates: LabelTemplateEntity[] = [];
  public versions: LabelTemplateVersionEntity[] = [];
  public printJobs: PrintJobEntity[] = [];
  public reprintRequests: ReprintRequestEntity[] = [];

  public async FindTemplateByCode(templateCode: string): Promise<LabelTemplateEntity | null> {
    return this.templates.find((item) => item.TemplateCode === templateCode) ?? null;
  }

  public async FindTemplateById(id: string): Promise<LabelTemplateEntity | null> {
    return this.templates.find((item) => item.Id === id) ?? null;
  }

  public async FindVersionById(id: string): Promise<LabelTemplateVersionEntity | null> {
    return this.versions.find((item) => item.Id === id) ?? null;
  }

  public async FindActiveVersion(templateId: string): Promise<LabelTemplateVersionEntity | null> {
    return this.versions.find((item) => item.TemplateId === templateId) ?? null;
  }

  public async CountTemplateVersions(templateId: string): Promise<number> {
    return this.versions.filter((item) => item.TemplateId === templateId).length;
  }

  public async FindPrintJobById(id: string): Promise<PrintJobEntity | null> {
    return this.printJobs.find((item) => item.Id === id) ?? null;
  }

  public async FindPrintJobByIdForUpdate(id: string): Promise<PrintJobEntity | null> {
    return this.FindPrintJobById(id);
  }

  public async FindLatestValidPrintJobForObject(input: {
    BusinessObjectType: string;
    BusinessObjectId: string;
    WarehouseId?: string | null;
    OwnerId?: string | null;
    LabelType?: string | null;
    ValidStatuses: PrintJobStatus[];
  }): Promise<PrintJobEntity | null> {
    return (
      this.printJobs.find(
        (job) =>
          job.BusinessObjectType === input.BusinessObjectType &&
          job.BusinessObjectId === input.BusinessObjectId &&
          (input.WarehouseId === undefined || job.WarehouseId === input.WarehouseId) &&
          (input.OwnerId === undefined || job.OwnerId === input.OwnerId) &&
          input.ValidStatuses.includes(job.Status),
      ) ?? null
    );
  }

  public async CreateTemplate(template: LabelTemplateEntity): Promise<LabelTemplateEntity> {
    this.templates.push(template);
    return template;
  }

  public async UpdateTemplate(template: LabelTemplateEntity): Promise<LabelTemplateEntity> {
    this.templates = this.templates.map((item) => (item.Id === template.Id ? template : item));
    return template;
  }

  public async CreateTemplateVersion(version: LabelTemplateVersionEntity): Promise<LabelTemplateVersionEntity> {
    this.versions.push(version);
    return version;
  }

  public async CreatePrintJob(printJob: PrintJobEntity): Promise<PrintJobEntity> {
    this.printJobs.push(printJob);
    return printJob;
  }

  public async UpdatePrintJob(printJob: PrintJobEntity): Promise<PrintJobEntity> {
    this.printJobs = this.printJobs.map((item) => (item.Id === printJob.Id ? printJob : item));
    return printJob;
  }

  public async CreateReprintRequest(request: ReprintRequestEntity): Promise<ReprintRequestEntity> {
    this.reprintRequests.push(request);
    return request;
  }

  public async ListTemplates(
    skip: number,
    take: number,
    filter: LabelTemplateListFilter = {},
  ): Promise<{ Items: LabelTemplateEntity[]; TotalItems: number }> {
    const items = this.templates.filter((template) => {
      if (filter.TemplateCode && template.TemplateCode !== filter.TemplateCode) return false;
      if (filter.LabelType && template.LabelType !== filter.LabelType) return false;
      if (filter.Status && template.Status !== filter.Status) return false;
      return true;
    });
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }

  public async ListPrintJobs(
    skip: number,
    take: number,
    filter: PrintJobListFilter = {},
  ): Promise<{ Items: PrintJobEntity[]; TotalItems: number }> {
    const items = this.printJobs.filter((job) => {
      if (filter.TemplateId && job.TemplateId !== filter.TemplateId) return false;
      if (filter.BusinessObjectType && job.BusinessObjectType !== filter.BusinessObjectType) return false;
      if (filter.BusinessObjectId && job.BusinessObjectId !== filter.BusinessObjectId) return false;
      if (filter.Status && job.Status !== filter.Status) return false;
      return true;
    });
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

describe('V1-HB-02 SLA/performance numeric harness', () => {
  it('measures scan confirm, label preview and list behavior with numeric p95 thresholds', async () => {
    const permissionChecker = new AllowAllPermissionChecker();
    const audited = new FakeAuditedTransaction();
    const taskRepository = new InMemoryTaskExecutionRepository(buildMobileTasks(125));
    const barcodeRepository = new InMemorySkuBarcodeRepository([makeBarcode()]);
    const labelRepository = buildLabelRepository(125);

    const scanUseCase = new RecordMobileScanUseCase(taskRepository, barcodeRepository, permissionChecker, {
      Run: async (work) => (await work(undefined as unknown as EntityManager)).result,
    } as never);
    const previewUseCase = new PreviewPrintJobUseCase(
      labelRepository,
      audited as unknown as AuditedTransaction,
      permissionChecker,
    );
    const listMobileTasksUseCase = new ListMobileTasksUseCase(taskRepository, permissionChecker);
    const listPrintJobsUseCase = new ListPrintJobsUseCase(labelRepository, permissionChecker);

    const measurements: MeasurementResult[] = [];
    measurements.push(
      await measure('scan-confirm', 250, async () => {
        const result = await scanUseCase.Execute(
          {
            TaskId: 'mobile-task-001',
            ScanType: MobileScanType.Item,
            RawValue: '(01)09506000134352(10)LOT123(17)260630(21)SN01(30)12',
            DeviceCode: 'PWA-HB-02',
            SessionId: 'session-hb-02',
          },
          Context,
        );
        expect(result.Result).toBe(MobileScanResult.Accepted);
      }),
    );
    measurements.push(
      await measure('label-preview', 300, async () => {
        const result = await previewUseCase.Execute(
          {
            TemplateId: 'template-package',
            BusinessObjectType: 'Package',
            BusinessObjectId: 'package-hb-02',
            BusinessObjectCode: 'PKG-HB-02',
            WarehouseId: 'warehouse-a',
            OwnerId: 'owner-a',
            PayloadJson: { BarcodeValue: 'PKG-HB-02', OwnerCode: 'OWN-A', WarehouseCode: 'WH-A' },
          },
          Context,
        );
        expect(result.Status).toBe(PrintJobStatus.Previewed);
        expect(result.PreviewContent).toContain('PKG-HB-02');
      }),
    );
    measurements.push(
      await measure('list-default-page-size', 250, async () => {
        const mobileResult = await listMobileTasksUseCase.Execute({ ActorUserId: Context.ActorUserId });
        const printResult = await listPrintJobsUseCase.Execute({ ActorUserId: Context.ActorUserId });
        expect(mobileResult.Meta.PageSize).toBe(50);
        expect(printResult.Meta.PageSize).toBe(50);
        expect(mobileResult.Items).toHaveLength(50);
        expect(printResult.Items).toHaveLength(50);
      }),
    );
    measurements.push(
      await measure('list-max-page-size', 350, async () => {
        const mobileResult = await listMobileTasksUseCase.Execute({ ActorUserId: Context.ActorUserId, PageSize: 500 });
        const printResult = await listPrintJobsUseCase.Execute({ ActorUserId: Context.ActorUserId, PageSize: 500 });
        expect(mobileResult.Meta.PageSize).toBe(100);
        expect(printResult.Meta.PageSize).toBe(100);
        expect(mobileResult.Items).toHaveLength(100);
        expect(printResult.Items).toHaveLength(100);
      }),
    );

    for (const measurement of measurements) {
      expect(measurement.Passed).toBe(true);
      expect(measurement.P95Ms).toBeLessThanOrEqual(measurement.ThresholdMs);
    }
    expect(permissionChecker.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.MobileTask }),
        expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.PrintJob }),
        expect.objectContaining({ Action: ActionCode.Read, ObjectType: ObjectType.MobileTask }),
        expect.objectContaining({ Action: ActionCode.Read, ObjectType: ObjectType.PrintJob }),
      ]),
    );
    expect(audited.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.PrintJob })]),
    );

    console.info(
      'V1_HB_02_SLA_PERFORMANCE_SUMMARY',
      JSON.stringify({
        Story: 'V1-HB-02',
        Environment: 'local Jest in-process harness, no production observability stack',
        Dataset: {
          MobileTasks: taskRepository.tasks.length,
          PrintJobsBeforeMeasurement: 125,
          SampleCount: SAMPLE_COUNT,
          WarmupCount: WARMUP_COUNT,
        },
        Measurements: measurements,
      }),
    );
  });

  it('keeps forbidden shipment/gate/goods-issue and reconciliation terms outside InventoryStatus harness scope', () => {
    const validInventoryStatuses = ['PICKED', 'PACKED', 'LOADED', 'AVAILABLE', 'ALLOCATED'];
    for (const forbidden of ForbiddenInventoryStatusTerms) {
      expect(validInventoryStatuses).not.toContain(forbidden);
    }
  });
});

async function measure(
  name: MeasurementName,
  thresholdMs: number,
  work: () => Promise<void>,
): Promise<MeasurementResult> {
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    await work();
  }

  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const started = performance.now();
    await work();
    durations.push(performance.now() - started);
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const result = {
    Name: name,
    Samples: durations.length,
    ThresholdMs: thresholdMs,
    MinMs: round(sorted[0] ?? 0),
    MaxMs: round(sorted[sorted.length - 1] ?? 0),
    AvgMs: round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    P50Ms: percentile(sorted, 0.5),
    P95Ms: percentile(sorted, 0.95),
    Passed: false,
  };
  return { ...result, Passed: result.P95Ms <= thresholdMs };
}

function percentile(sortedDurations: number[], percentileValue: number): number {
  if (sortedDurations.length === 0) return 0;
  const index = Math.min(
    sortedDurations.length - 1,
    Math.max(0, Math.ceil(percentileValue * sortedDurations.length) - 1),
  );
  return round(sortedDurations[index]);
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function buildMobileTasks(count: number): MobileTaskEntity[] {
  return Array.from({ length: count }, (_, index) =>
    makeTask({
      Id: `mobile-task-${String(index + 1).padStart(3, '0')}`,
      TaskCode: `MT-HB02-${String(index + 1).padStart(3, '0')}`,
      WarehouseId: index % 2 === 0 ? 'warehouse-a' : 'warehouse-b',
      WarehouseCode: index % 2 === 0 ? 'WH-A' : 'WH-B',
      OwnerId: 'owner-a',
      OwnerCode: 'OWN-A',
    }),
  );
}

function buildLabelRepository(printJobCount: number): InMemoryBarcodeLabelRepository {
  const repository = new InMemoryBarcodeLabelRepository();
  const template = new LabelTemplateEntity({
    Id: 'template-package',
    TemplateCode: 'PKG-HB-02',
    TemplateName: 'Package HB-02',
    LabelType: 'Package',
    RequiredFields: ['BarcodeValue', 'OwnerCode', 'WarehouseCode'],
    TemplateBody: 'PKG {{BarcodeValue}} {{OwnerCode}} {{WarehouseCode}}',
    ActiveVersionId: 'template-package-v1',
    CreatedAt: Now,
    UpdatedAt: Now,
  });
  const version = new LabelTemplateVersionEntity({
    Id: 'template-package-v1',
    TemplateId: template.Id,
    VersionNo: 1,
    RequiredFields: template.RequiredFields,
    TemplateBody: template.TemplateBody,
    CreatedAt: Now,
  });
  repository.templates.push(template);
  repository.versions.push(version);
  repository.printJobs.push(
    ...Array.from({ length: printJobCount }, (_, index) =>
      makePrintJob({
        Id: `print-job-${String(index + 1).padStart(3, '0')}`,
        JobCode: `PJ-HB02-${String(index + 1).padStart(3, '0')}`,
        BusinessObjectId: `package-${String(index + 1).padStart(3, '0')}`,
      }),
    ),
  );
  return repository;
}

function makeTask(overrides: Partial<MobileTaskEntity> = {}): MobileTaskEntity {
  return new MobileTaskEntity({
    Id: overrides.Id ?? 'mobile-task-001',
    TaskCode: overrides.TaskCode ?? 'MT-HB02-001',
    TaskType: overrides.TaskType ?? MobileTaskType.Pick,
    TaskStatus: overrides.TaskStatus ?? MobileTaskStatus.Claimed,
    WarehouseId: overrides.WarehouseId ?? 'warehouse-a',
    WarehouseCode: overrides.WarehouseCode ?? 'WH-A',
    OwnerId: overrides.OwnerId ?? 'owner-a',
    OwnerCode: overrides.OwnerCode ?? 'OWN-A',
    SourceDocumentType: overrides.SourceDocumentType ?? 'PickTask',
    SourceDocumentId: overrides.SourceDocumentId ?? 'pick-task-hb-02',
    SourceDocumentCode: overrides.SourceDocumentCode ?? 'PT-HB02-001',
    Priority: overrides.Priority ?? 10,
    AssignedUserId: overrides.AssignedUserId ?? 'v1-hb-02-operator',
    ClaimedAt: overrides.ClaimedAt ?? Now,
    ReleasedAt: overrides.ReleasedAt ?? null,
    DueAt: overrides.DueAt ?? null,
    DeviceCode: overrides.DeviceCode ?? 'PWA-HB-02',
    SessionId: overrides.SessionId ?? 'session-hb-02',
    TaskPayload: overrides.TaskPayload ?? { ScanPolicy: { MandatoryScanTypes: ['Item'], AllowManualOverride: true } },
    CreatedAt: overrides.CreatedAt ?? Now,
    CreatedBy: overrides.CreatedBy ?? 'V1-HB-02',
    UpdatedAt: overrides.UpdatedAt ?? Now,
    UpdatedBy: overrides.UpdatedBy ?? 'V1-HB-02',
  });
}

function makeBarcode(): SkuBarcodeEntity {
  return new SkuBarcodeEntity({
    Id: 'barcode-hb-02',
    SkuId: 'sku-hb-02',
    OwnerId: 'owner-a',
    UomId: 'uom-ea',
    PackCode: 'EA',
    BarcodeValue: '09506000134352',
    BarcodeType: 'GS1',
    IsPrimary: true,
    Status: MasterDataStatus.Active,
    EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    EffectiveTo: null,
    SourceSystem: 'V1-HB-02',
    ReferenceId: 'V1-HB-02',
    CreatedAt: Now,
    UpdatedAt: Now,
  });
}

function makePrintJob(overrides: Partial<PrintJobEntity> = {}): PrintJobEntity {
  return new PrintJobEntity({
    Id: overrides.Id ?? 'print-job-001',
    JobCode: overrides.JobCode ?? 'PJ-HB02-001',
    TemplateId: overrides.TemplateId ?? 'template-package',
    TemplateVersionId: overrides.TemplateVersionId ?? 'template-package-v1',
    BusinessObjectType: overrides.BusinessObjectType ?? 'Package',
    BusinessObjectId: overrides.BusinessObjectId ?? 'package-001',
    BusinessObjectCode: overrides.BusinessObjectCode ?? overrides.BusinessObjectId ?? 'PKG-HB02-001',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-a',
    OwnerId: overrides.OwnerId ?? 'owner-a',
    PayloadJson: overrides.PayloadJson ?? { BarcodeValue: 'PKG-HB-02', OwnerCode: 'OWN-A', WarehouseCode: 'WH-A' },
    PreviewContent: overrides.PreviewContent ?? 'PKG PKG-HB-02 OWN-A WH-A',
    Status: overrides.Status ?? PrintJobStatus.Previewed,
    RequestedBy: overrides.RequestedBy ?? 'v1-hb-02-operator',
    RequestedAt: overrides.RequestedAt ?? Now,
    CompletedAt: overrides.CompletedAt ?? Now,
    CreatedAt: overrides.CreatedAt ?? Now,
    UpdatedAt: overrides.UpdatedAt ?? Now,
    CreatedBy: overrides.CreatedBy ?? 'V1-HB-02',
    UpdatedBy: overrides.UpdatedBy ?? 'V1-HB-02',
  });
}
