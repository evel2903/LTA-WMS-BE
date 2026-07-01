import { createHash, randomUUID } from 'crypto';
import type { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import { ReprintRequestStatus } from '@modules/BarcodeLabel/Domain/Enums/ReprintRequestStatus';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';
import { CycleCountWorkOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/CycleCountWorkOrmEntity';
import { ReplenishmentTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/ReplenishmentTaskOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { PackageContentOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageContentOrmEntity';
import { PackageOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { GetEnv } from '@shared/Config/Env/Env';
import { AssertDemoDataCcLocalConnectionTarget } from '@shared/Database/Seed/DemoDataCcTargetGuard';

const DemoScreenPrefix = 'LTA-SCREEN-DEMO';
const LegacyDemoScreenPrefix = 'CC-SCREEN-DEMO';
export const DemoDataCcScreenCoverageAuditLogId = '22222222-2222-4222-8222-222222222106';
export const DemoDataCcScreenCoverageOverrideLogId = '22222222-2222-4222-8222-222222222306';
const DemoRuleId = '11111111-1111-4111-8111-111111111205';
const DemoCorrelationId = 'DEMO-DATA-LTA-SCREEN-COVERAGE';
const LegacyDemoCorrelationId = 'DEMO-DATA-CC-SCREEN-COVERAGE';
const LegacyDemoDataCcScreenCoverageAuditLogIds = [
  '11111111-1111-4111-8111-111111111105',
  '22222222-2222-4222-8222-222222222105',
] as const;
const LegacyDemoDataCcScreenCoverageOverrideLogIds = [
  '11111111-1111-4111-8111-111111111305',
  '22222222-2222-4222-8222-222222222305',
] as const;
const DemoNow = new Date('2026-06-26T04:15:00.000Z');
export const DemoDataCcScreenCoverageScenarioCode = 'WT-01';
export const DemoDataCcScreenCoverageFlowReference = 'LTA-DEMO-WT01';
export const DemoDataCcScreenCoverageLpnCode = 'LTA-FLOW-LPN-WT01';
export const DemoDataCcScreenCoverageLotNumber = 'LTA-FLOW-BATCH-WT01';
export const DemoDataCcScreenCoverageExpiryDate = '2026-09-30';
export const DemoDataCcScreenCoverageScenarioQuantity = 12;

export const DemoDataCcScreenCoverageTables = [
  'label_templates',
  'label_template_versions',
  'print_jobs',
  'reprint_requests',
  'mobile_tasks',
  'mobile_scan_events',
  'cycle_count_works',
  'replenishment_tasks',
  'approval_requests',
  'audit_logs',
  'override_logs',
  'exception_cases',
] as const;

export type DemoDataCcScreenCoverageSeedResult = {
  LabelTemplateCount: number;
  PrintJobCount: number;
  ReprintRequestCount: number;
  MobileTaskCount: number;
  MobileScanEventCount: number;
  CycleCountWorkCount: number;
  ReplenishmentTaskCount: number;
  ApprovalRequestCount: number;
  AuditLogCount: number;
  OverrideLogCount: number;
  ExceptionCaseCount: number;
};

export type DemoDataCcScreenCoverageSourceConsistencyInput = {
  PackageContent: {
    SkuId: string;
    UomId: string | null | undefined;
  };
  PickTask: {
    SkuId: string;
    UomId: string | null | undefined;
    SourceLocationId: string;
  };
  SourceDimension: {
    SkuId: string;
    UomId: string | null;
    LocationId: string;
    LpnCode: string | null | undefined;
  };
};

export type DemoDataCcScreenCoverageQuantityInput = {
  Quantity: number | string;
};

type ScreenCoverageContext = {
  Actor: UserOrmEntity;
  Owner: OwnerOrmEntity;
  Warehouse: WarehouseOrmEntity;
  Sku: SkuOrmEntity;
  Location: LocationOrmEntity;
  Uom: UomOrmEntity | null;
  InventoryStatus: InventoryStatusOrmEntity;
  SourceDimension: InventoryDimensionOrmEntity;
  SourceBalance: InventoryBalanceOrmEntity;
  LpnCode: string;
  LotNumber: string;
  ExpiryDate: string;
  Rule: {
    Id: string;
    RuleCode: string;
    ControlMode: string;
  };
  Reason: ReasonCodeOrmEntity | null;
  PickTask: PickTaskOrmEntity;
  Package: PackageOrmEntity;
};

export const BuildDemoDataCcScreenCoveragePlan = (): { ScreenGroups: string[]; NoFakeLiveCapability: boolean } => ({
  ScreenGroups: ['barcode-label', 'rf-mobile', 'cycle-count', 'replenishment', 'approval-audit-override-exception'],
  NoFakeLiveCapability: true,
});

export const BuildDemoDataCcScreenCoverageGovernanceLinkage = (): {
  OverrideAuditRef: string;
  AuditReferenceType: 'OverrideLog';
  AuditReferenceId: string;
} => ({
  OverrideAuditRef: DemoCorrelationId,
  AuditReferenceType: 'OverrideLog',
  AuditReferenceId: DemoDataCcScreenCoverageOverrideLogId,
});

export const SeedDemoDataCcScreenCoverage = async (
  dataSource: DataSource,
): Promise<DemoDataCcScreenCoverageSeedResult> =>
  await dataSource.transaction(async (manager) => {
    await CleanupDemoDataCcScreenCoverage(manager);
    const context = await BuildContext(manager);
    const label = await SeedLabelAndPrint(manager, context);
    const mobile = await SeedMobile(manager, context);
    const inventoryExecution = await SeedInventoryExecution(manager, context);
    const governance = await SeedGovernance(manager, context, inventoryExecution.CycleCountWorkId);

    return {
      ...label,
      ...mobile,
      ...inventoryExecution.Counts,
      ...governance,
    };
  });

export const CleanupDemoDataCcScreenCoverage = async (manager: EntityManager): Promise<void> => {
  AssertDemoDataCcLocalConnectionTarget(manager.connection.options, GetEnv(), 'EntityManager.connection.options');
  await AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows(manager);
  await CleanupDemoDataCcScreenCoverageByCodes(
    manager,
    BuildDemoDataCcScreenCoverageCleanupCodes(DemoScreenPrefix),
    DemoCorrelationId,
  );
  await CleanupDemoDataCcScreenCoverageByCodes(
    manager,
    BuildDemoDataCcScreenCoverageCleanupCodes(LegacyDemoScreenPrefix),
    LegacyDemoCorrelationId,
  );
  await AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows(manager);
};

type DemoDataCcScreenCoverageCleanupCodes = {
  TemplateCodes: string[];
  PrintJobCodes: string[];
  MobileTaskCodes: string[];
  ReplenishmentTaskCodes: string[];
  CycleCountCodes: string[];
  ExceptionReferenceIds: string[];
};

const BuildDemoDataCcScreenCoverageCleanupCodes = (screenPrefix: string): DemoDataCcScreenCoverageCleanupCodes => ({
  TemplateCodes: [`LBL-${screenPrefix}-LPN`],
  PrintJobCodes: [`PJ-${screenPrefix}-${DemoDataCcScreenCoverageScenarioCode.replace('-', '')}-LPN`],
  MobileTaskCodes: [`MT-${screenPrefix}-PICK-${DemoDataCcScreenCoverageScenarioCode.replace('-', '')}`],
  ReplenishmentTaskCodes: [`RP-${screenPrefix}-PF-A01`],
  CycleCountCodes: [`CCW-${screenPrefix}-RSV-A01`],
  ExceptionReferenceIds: [`${screenPrefix}-CYCLE-VARIANCE`],
});

const CleanupDemoDataCcScreenCoverageByCodes = async (
  manager: EntityManager,
  codes: DemoDataCcScreenCoverageCleanupCodes,
  correlationId: string,
): Promise<void> => {
  await manager.query(
    `DELETE FROM reprint_requests WHERE original_print_job_id IN (SELECT id FROM print_jobs WHERE job_code = ANY($1::text[]))`,
    [codes.PrintJobCodes],
  );
  await manager.query(`DELETE FROM print_jobs WHERE job_code = ANY($1::text[])`, [codes.PrintJobCodes]);
  await manager.query(
    `DELETE FROM label_template_versions WHERE template_id IN (SELECT id FROM label_templates WHERE template_code = ANY($1::text[]))`,
    [codes.TemplateCodes],
  );
  await manager.query(`DELETE FROM label_templates WHERE template_code = ANY($1::text[])`, [codes.TemplateCodes]);
  await manager.query(
    `DELETE FROM mobile_scan_events WHERE task_id IN (SELECT id FROM mobile_tasks WHERE task_code = ANY($1::text[]))`,
    [codes.MobileTaskCodes],
  );
  await manager.query(`DELETE FROM mobile_tasks WHERE task_code = ANY($1::text[])`, [codes.MobileTaskCodes]);
  await manager.query(`DELETE FROM replenishment_tasks WHERE task_code = ANY($1::text[])`, [
    codes.ReplenishmentTaskCodes,
  ]);
  await manager.query(`DELETE FROM cycle_count_works WHERE count_code = ANY($1::text[])`, [codes.CycleCountCodes]);
  await manager.query(`DELETE FROM exception_cases WHERE reference_id = ANY($1::text[])`, [
    codes.ExceptionReferenceIds,
  ]);
  await manager.query(`DELETE FROM approval_requests WHERE correlation_id = $1`, [correlationId]);
};

const BuildContext = async (manager: EntityManager): Promise<ScreenCoverageContext> => {
  const actor = await RequiredByCode(manager.getRepository(UserOrmEntity), 'EmailAddress', 'admin@example.com');
  const owner = await RequiredByCode(manager.getRepository(OwnerOrmEntity), 'OwnerCode', 'LTA');
  const warehouse = await RequiredByCode(manager.getRepository(WarehouseOrmEntity), 'WarehouseCode', 'LTA-HCM-01');
  const reason =
    (await manager.getRepository(ReasonCodeOrmEntity).findOne({ where: { ReasonCode: 'DEMO_ACCEPTANCE' } })) ??
    (await manager.getRepository(ReasonCodeOrmEntity).findOne({ where: { Status: 'ACTIVE' } }));
  const pickTask = await RequiredByCode(
    manager.getRepository(PickTaskOrmEntity),
    'TaskNumber',
    `PT-${DemoDataCcScreenCoverageFlowReference}`,
  );
  const packageEntity = await RequiredByCode(
    manager.getRepository(PackageOrmEntity),
    'PackageCode',
    `PKG-${DemoDataCcScreenCoverageFlowReference}`,
  );
  const packageContents = await manager.getRepository(PackageContentOrmEntity).find({
    where: {
      PackageId: packageEntity.Id,
      PickTaskId: pickTask.Id,
    },
  });
  if (packageContents.length !== 1) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires exactly one PackageContent for ${packageEntity.PackageCode}/${pickTask.TaskNumber}; found ${packageContents.length}.`,
    );
  }
  const packageContent = packageContents[0] as PackageContentOrmEntity;
  if (
    packageContent.SourceBalanceId !== pickTask.SourceBalanceId ||
    packageContent.SourceDimensionId !== pickTask.SourceDimensionId
  ) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires WT-01 package content and pick task source match.`);
  }

  const sourceBalance = await RequiredById(
    manager.getRepository(InventoryBalanceOrmEntity),
    packageContent.SourceBalanceId,
  );
  const sourceDimension = await RequiredById(
    manager.getRepository(InventoryDimensionOrmEntity),
    packageContent.SourceDimensionId,
  );
  if (sourceBalance.DimensionId !== sourceDimension.Id) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires WT-01 source balance and dimension match.`);
  }
  const lpnCode = AssertDemoDataCcScreenCoverageSourceConsistency({
    PackageContent: packageContent,
    PickTask: pickTask,
    SourceDimension: sourceDimension,
  });
  const sku = await RequiredById(manager.getRepository(SkuOrmEntity), packageContent.SkuId);
  const location = await RequiredById(manager.getRepository(LocationOrmEntity), sourceDimension.LocationId);
  const inventoryStatus = await RequiredById(
    manager.getRepository(InventoryStatusOrmEntity),
    sourceDimension.InventoryStatusId,
  );
  const uom = packageContent.UomId
    ? await RequiredById(manager.getRepository(UomOrmEntity), packageContent.UomId)
    : null;
  const lotNumber = RequireMatchingText(
    [
      ['package content LotNumber', packageContent.LotNumber],
      ['pick task LotNumber', pickTask.LotNumber],
      ['source dimension LotNumber', sourceDimension.LotNumber],
    ],
    'WT-01 LotNumber',
  );
  const expiryDate = RequireMatchingDate(
    [
      ['package content ExpiryDate', packageContent.ExpiryDate],
      ['pick task ExpiryDate', pickTask.ExpiryDate],
      ['source dimension ExpiryDate', sourceDimension.ExpiryDate],
    ],
    'WT-01 ExpiryDate',
  );
  AssertDemoDataCcScreenCoverageStockIdentity({
    LotNumber: lotNumber,
    ExpiryDate: expiryDate,
  });

  return {
    Actor: actor,
    Owner: owner,
    Warehouse: warehouse,
    Sku: sku,
    Location: location,
    Uom: uom,
    InventoryStatus: inventoryStatus,
    SourceDimension: sourceDimension,
    SourceBalance: sourceBalance,
    LpnCode: lpnCode,
    LotNumber: lotNumber,
    ExpiryDate: expiryDate,
    Rule: {
      Id: DemoRuleId,
      RuleCode: 'LTA-DEMO-OVERRIDE-READINESS',
      ControlMode: 'APPROVAL_REQUIRED',
    },
    Reason: reason,
    PickTask: pickTask,
    Package: packageEntity,
  };
};

const SeedLabelAndPrint = async (
  manager: EntityManager,
  context: ScreenCoverageContext,
): Promise<
  Pick<DemoDataCcScreenCoverageSeedResult, 'LabelTemplateCount' | 'PrintJobCount' | 'ReprintRequestCount'>
> => {
  const templateId = randomUUID();
  const templateVersionId = randomUUID();
  const printJobId = randomUUID();

  await SaveEntity(manager.getRepository(LabelTemplateOrmEntity), {
    Id: templateId,
    TemplateCode: `LBL-${DemoScreenPrefix}-LPN`,
    TemplateName: 'Tem LPN demo LTA',
    LabelType: 'LPN',
    Status: LabelTemplateStatus.Active,
    RequiredFields: ['skuCode', 'lpnCode', 'lotNumber', 'expiryDate'],
    TemplateBody: 'LTA SEAL {{skuCode}} / {{lpnCode}} / {{lotNumber}} / {{expiryDate}}',
    ActiveVersionId: templateVersionId,
    CreatedAt: DemoNow,
    UpdatedAt: DemoNow,
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(LabelTemplateVersionOrmEntity), {
    Id: templateVersionId,
    TemplateId: templateId,
    VersionNo: 1,
    TemplateBody: 'LTA SEAL {{skuCode}} / {{lpnCode}} / {{lotNumber}} / {{expiryDate}}',
    RequiredFields: ['skuCode', 'lpnCode', 'lotNumber', 'expiryDate'],
    Status: LabelTemplateStatus.Active,
    CreatedAt: DemoNow,
    CreatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(PrintJobOrmEntity), {
    Id: printJobId,
    JobCode: `PJ-${DemoScreenPrefix}-${DemoDataCcScreenCoverageScenarioCode.replace('-', '')}-LPN`,
    TemplateId: templateId,
    TemplateVersionId: templateVersionId,
    BusinessObjectType: 'Package',
    BusinessObjectId: context.Package.Id,
    BusinessObjectCode: context.Package.PackageCode,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    PayloadJson: {
      skuCode: context.Sku.SkuCode,
      lpnCode: context.LpnCode,
      lotNumber: context.LotNumber,
      expiryDate: context.ExpiryDate,
    },
    PreviewContent: `LTA SEAL ${context.Sku.SkuCode} / ${context.LpnCode} / ${context.LotNumber} / ${context.ExpiryDate}`,
    Status: PrintJobStatus.Previewed,
    ValidationErrors: null,
    ReprintCount: 1,
    RequestedBy: context.Actor.Id,
    RequestedAt: AddMinutes(DemoNow, 1),
    CompletedAt: null,
    CreatedAt: AddMinutes(DemoNow, 1),
    UpdatedAt: AddMinutes(DemoNow, 1),
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(ReprintRequestOrmEntity), {
    Id: randomUUID(),
    OriginalPrintJobId: printJobId,
    ReprintSequence: 1,
    ReasonCode: 'DEMO_REPRINT',
    ReasonCodeId: context.Reason?.Id ?? null,
    ReasonNote: 'Demo yêu cầu in lại tem LPN.',
    EvidenceRefs: [`${DemoScreenPrefix}:reprint`],
    Status: ReprintRequestStatus.Requested,
    RequestedBy: context.Actor.Id,
    RequestedAt: AddMinutes(DemoNow, 2),
  });

  return { LabelTemplateCount: 1, PrintJobCount: 1, ReprintRequestCount: 1 };
};

const SeedMobile = async (
  manager: EntityManager,
  context: ScreenCoverageContext,
): Promise<Pick<DemoDataCcScreenCoverageSeedResult, 'MobileTaskCount' | 'MobileScanEventCount'>> => {
  const taskId = randomUUID();
  await SaveEntity(manager.getRepository(MobileTaskOrmEntity), {
    Id: taskId,
    TaskCode: `MT-${DemoScreenPrefix}-PICK-${DemoDataCcScreenCoverageScenarioCode.replace('-', '')}`,
    TaskType: MobileTaskType.Pick,
    TaskStatus: MobileTaskStatus.Completed,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    SourceDocumentType: 'PickTask',
    SourceDocumentId: context.PickTask.Id,
    SourceDocumentCode: context.PickTask.TaskNumber,
    Priority: 20,
    AssignedUserId: context.Actor.Id,
    ClaimedAt: AddMinutes(DemoNow, 3),
    ReleasedAt: AddMinutes(DemoNow, 3),
    DueAt: AddMinutes(DemoNow, 90),
    DeviceCode: 'RF-DEMO-01',
    SessionId: `${DemoScreenPrefix}-RF-SESSION`,
    TaskPayload: {
      skuCode: context.Sku.SkuCode,
      locationCode: context.Location.LocationCode,
      lpnCode: context.LpnCode,
    },
    CreatedAt: AddMinutes(DemoNow, 3),
    CreatedBy: context.Actor.Id,
    UpdatedAt: AddMinutes(DemoNow, 4),
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(MobileScanEventOrmEntity), {
    Id: randomUUID(),
    TaskId: taskId,
    TaskCode: `MT-${DemoScreenPrefix}-PICK-${DemoDataCcScreenCoverageScenarioCode.replace('-', '')}`,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    ScanType: MobileScanType.Lpn,
    RawValue: context.LpnCode,
    NormalizedValue: context.LpnCode,
    Result: MobileScanResult.Accepted,
    ResolvedObjectType: 'PickTask',
    ResolvedObjectId: context.PickTask.Id,
    ParsedValueJson: {
      lpnCode: context.LpnCode,
      scenario: DemoDataCcScreenCoverageScenarioCode,
    },
    RejectionCode: null,
    RejectionMessage: null,
    ReasonCode: null,
    DeviceCode: 'RF-DEMO-01',
    SessionId: `${DemoScreenPrefix}-RF-SESSION`,
    ActorUserId: context.Actor.Id,
    CreatedAt: AddMinutes(DemoNow, 4),
  });

  return { MobileTaskCount: 1, MobileScanEventCount: 1 };
};

const SeedInventoryExecution = async (
  manager: EntityManager,
  context: ScreenCoverageContext,
): Promise<{
  CycleCountWorkId: string;
  Counts: Pick<DemoDataCcScreenCoverageSeedResult, 'CycleCountWorkCount' | 'ReplenishmentTaskCount'>;
}> => {
  const cycleCountWorkId = randomUUID();
  await SaveEntity(manager.getRepository(CycleCountWorkOrmEntity), {
    Id: cycleCountWorkId,
    CountCode: `CCW-${DemoScreenPrefix}-RSV-A01`,
    WorkStatus: CycleCountWorkStatus.PendingReview,
    SourceBalanceId: context.SourceBalance.Id,
    LockedBalanceId: null,
    OriginalInventoryStatusCode: context.InventoryStatus.StatusCode,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    SkuId: context.Sku.Id,
    SkuCode: context.Sku.SkuCode,
    LocationId: context.Location.Id,
    LocationCode: context.Location.LocationCode,
    UomId: context.Uom?.Id ?? null,
    UomCode: context.Uom?.UomCode ?? null,
    LpnCode: context.SourceDimension.LpnCode,
    ExpectedQuantity: Number(context.SourceBalance.QtyOnHand),
    CountedQuantity: Number(context.SourceBalance.QtyOnHand) - 1,
    VarianceQuantity: -1,
    ToleranceQuantity: 0,
    ApprovalRequestId: null,
    LockTransactionId: null,
    SubmitIdempotencyKey: `${DemoScreenPrefix}-cycle-submit`,
    SubmitPayloadFingerprint: Hash(`${DemoScreenPrefix}-cycle-submit`),
    AdjustmentTransactionId: null,
    AdjustmentIdempotencyKey: null,
    AdjustmentPayloadFingerprint: null,
    UnlockTransactionId: null,
    UnlockIdempotencyKey: null,
    UnlockPayloadFingerprint: null,
    CreateIdempotencyKey: `${DemoScreenPrefix}-cycle-create`,
    CreatePayloadFingerprint: Hash(`${DemoScreenPrefix}-cycle-create`),
    ReasonCode: 'DEMO_CYCLE_COUNT',
    ReasonCodeId: context.Reason?.Id ?? null,
    ReasonNote: 'Demo kiểm kê chênh lệch nhỏ cần xem xét.',
    EvidenceRefs: [`${DemoScreenPrefix}:cycle-count`],
    CreatedAt: AddMinutes(DemoNow, 5),
    UpdatedAt: AddMinutes(DemoNow, 5),
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(ReplenishmentTaskOrmEntity), {
    Id: randomUUID(),
    TaskCode: `RP-${DemoScreenPrefix}-PF-A01`,
    TaskStatus: ReplenishmentTaskStatus.Released,
    TriggerType: ReplenishmentTriggerType.MinMax,
    SourceBalanceId: context.SourceBalance.Id,
    SourceDimensionId: context.SourceDimension.Id,
    SourceLocationId: context.Location.Id,
    SourceLocationCode: context.Location.LocationCode,
    SourceInventoryStatusCode: context.InventoryStatus.StatusCode,
    TargetLocationId: context.Location.Id,
    TargetLocationCode: context.Location.LocationCode,
    TargetLocationProfileId: context.Location.LocationProfileId,
    WarehouseId: context.Warehouse.Id,
    WarehouseCode: context.Warehouse.WarehouseCode,
    OwnerId: context.Owner.Id,
    OwnerCode: context.Owner.OwnerCode,
    SkuId: context.Sku.Id,
    SkuCode: context.Sku.SkuCode,
    UomId: context.Uom?.Id ?? null,
    UomCode: context.Uom?.UomCode ?? null,
    Quantity: ResolveDemoDataCcScreenCoverageQuantity(context.PickTask),
    ShortPickReference: 'DEMO-DATA-LTA-SHORT-PICK',
    Priority: 30,
    WorkPoolCode: 'LTA-DEMO-REPLENISH',
    AssignedUserId: null,
    EligibilityDecisionJson: { eligible: true, source: 'demo-screen-coverage' },
    OutboxMessageId: null,
    ConfirmTransactionId: null,
    ConfirmMovementId: null,
    ConfirmOutboxMessageId: null,
    ReleaseIdempotencyKey: `${DemoScreenPrefix}-replenishment-release`,
    ReleasePayloadFingerprint: Hash(`${DemoScreenPrefix}-replenishment-release`),
    ConfirmIdempotencyKey: null,
    ConfirmPayloadFingerprint: null,
    CancelIdempotencyKey: null,
    CancelPayloadFingerprint: null,
    ReasonCode: 'DEMO_REPLENISHMENT',
    ReasonCodeId: context.Reason?.Id ?? null,
    ReasonNote: 'Demo bổ sung hàng từ reserve sang pick face.',
    EvidenceRefs: [`${DemoScreenPrefix}:replenishment`],
    ReleasedAt: AddMinutes(DemoNow, 6),
    ReleasedBy: context.Actor.Id,
    ConfirmedAt: null,
    ConfirmedBy: null,
    CancelledAt: null,
    CancelledBy: null,
    CreatedAt: AddMinutes(DemoNow, 6),
    UpdatedAt: AddMinutes(DemoNow, 6),
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });

  return { CycleCountWorkId: cycleCountWorkId, Counts: { CycleCountWorkCount: 1, ReplenishmentTaskCount: 1 } };
};

const SeedGovernance = async (
  manager: EntityManager,
  context: ScreenCoverageContext,
  cycleCountWorkId: string,
): Promise<
  Pick<
    DemoDataCcScreenCoverageSeedResult,
    'ApprovalRequestCount' | 'AuditLogCount' | 'OverrideLogCount' | 'ExceptionCaseCount'
  >
> => {
  const approvalRequestId = randomUUID();
  await SaveEntity(manager.getRepository(ApprovalRequestOrmEntity), {
    Id: approvalRequestId,
    RequesterUserId: context.Actor.Id,
    Action: 'Approve',
    TargetObjectType: 'CycleCountWork',
    TargetObjectId: cycleCountWorkId,
    TargetObjectCode: `CCW-${DemoScreenPrefix}-RSV-A01`,
    Scope: { warehouseCode: context.Warehouse.WarehouseCode, ownerCode: context.Owner.OwnerCode },
    RequestReasonCodeId: context.Reason?.Id ?? null,
    RequestReasonNote: 'Demo kiểm kê cần phê duyệt chênh lệch.',
    EvidenceRefs: [`${DemoScreenPrefix}:approval`],
    Decision: 'PENDING',
    DecidedByUserId: null,
    DecisionReasonCodeId: null,
    DecisionNote: null,
    DecidedAt: null,
    ReferenceType: 'CycleCountWork',
    ReferenceId: cycleCountWorkId,
    CorrelationId: DemoCorrelationId,
    CreatedAt: AddMinutes(DemoNow, 7),
    UpdatedAt: AddMinutes(DemoNow, 7),
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(ExceptionCaseOrmEntity), {
    Id: randomUUID(),
    ExceptionType: 'DEMO_CYCLE_VARIANCE',
    State: 'LOGGED',
    SubStatus: 'PENDING_APPROVAL',
    Outcome: null,
    ReferenceType: 'CycleCountWork',
    ReferenceId: `${DemoScreenPrefix}-CYCLE-VARIANCE`,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    ReasonCodeId: context.Reason?.Id ?? null,
    AssignedToUserId: context.Actor.Id,
    AssignedRoleId: null,
    DetectedRuleId: context.Rule.Id,
    ApprovalRequestId: approvalRequestId,
    Severity: 'MEDIUM',
    EvidenceRefs: [`${DemoScreenPrefix}:exception`],
    ResolutionNote: null,
    OpenedAt: AddMinutes(DemoNow, 8),
    ResolvedAt: null,
    ClosedAt: null,
    CreatedAt: AddMinutes(DemoNow, 8),
    UpdatedAt: AddMinutes(DemoNow, 8),
    CreatedBy: context.Actor.Id,
    UpdatedBy: context.Actor.Id,
  });
  await InsertOverrideLogOnce(manager, context);
  await InsertAuditLogOnce(manager, context);
  await AssertDemoDataCcScreenCoverageCurrentAppendOnlyRows(manager);

  return { ApprovalRequestCount: 1, AuditLogCount: 1, OverrideLogCount: 1, ExceptionCaseCount: 1 };
};

const InsertOverrideLogOnce = async (manager: EntityManager, context: ScreenCoverageContext): Promise<void> => {
  const linkage = BuildDemoDataCcScreenCoverageGovernanceLinkage();

  await manager.query(
    `
      INSERT INTO override_logs (
        id, rule_id, rule_code, actor_user_id, target_object_type, target_object_id,
        target_object_code, scope, control_mode, action, reason_code_id, reason_note,
        evidence_refs, approval_request_id, before_json, after_json, audit_ref,
        correlation_id, created_at, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8::jsonb, $9, $10, $11, $12,
        $13::jsonb, $14, $15::jsonb, $16::jsonb, $17,
        $18, $19, $20
      )
      ON CONFLICT (id) DO NOTHING
    `,
    [
      DemoDataCcScreenCoverageOverrideLogId,
      context.Rule.Id,
      context.Rule.RuleCode,
      context.Actor.Id,
      'InboundPlan',
      'LTA-DEMO-WT01-INB',
      'LTA-DEMO-WT01-INB',
      JSON.stringify({ warehouseCode: context.Warehouse.WarehouseCode, ownerCode: context.Owner.OwnerCode }),
      context.Rule.ControlMode,
      'Override',
      context.Reason?.Id ?? null,
      'Demo override readiness để minh họa governance.',
      JSON.stringify([`${DemoScreenPrefix}:override`]),
      null,
      JSON.stringify({ allowed: false }),
      JSON.stringify({ allowed: true, overrideAccepted: true }),
      linkage.OverrideAuditRef,
      DemoCorrelationId,
      AddMinutes(DemoNow, 9),
      context.Actor.Id,
    ],
  );
};

const InsertAuditLogOnce = async (manager: EntityManager, context: ScreenCoverageContext): Promise<void> => {
  const linkage = BuildDemoDataCcScreenCoverageGovernanceLinkage();

  await manager.query(
    `
      INSERT INTO audit_logs (
        id, occurred_at, actor_user_id, actor_role_codes, actor_type, action,
        object_type, object_id, object_code, before_json, after_json,
        reason_code_id, reason_note, evidence_refs, reference_type, reference_id,
        warehouse_id, owner_id, scope_json, correlation_id, request_id, ip_address,
        user_agent, result
      )
      VALUES (
        $1, $2, $3, $4::jsonb, $5, $6,
        $7, $8, $9, $10::jsonb, $11::jsonb,
        $12, $13, $14::jsonb, $15, $16,
        $17, $18, $19::jsonb, $20, $21, $22,
        $23, $24
      )
      ON CONFLICT (id) DO NOTHING
    `,
    [
      DemoDataCcScreenCoverageAuditLogId,
      AddMinutes(DemoNow, 9),
      context.Actor.Id,
      JSON.stringify(['WMS_ADMIN']),
      'USER',
      'Override',
      'InboundPlan',
      'LTA-DEMO-WT01-INB',
      'LTA-DEMO-WT01-INB',
      JSON.stringify({ allowed: false }),
      JSON.stringify({ allowed: true, overrideAccepted: true }),
      context.Reason?.Id ?? null,
      'Demo audit log cho screen coverage.',
      JSON.stringify([`${DemoScreenPrefix}:audit`]),
      linkage.AuditReferenceType,
      linkage.AuditReferenceId,
      context.Warehouse.Id,
      context.Owner.Id,
      JSON.stringify({ warehouseCode: context.Warehouse.WarehouseCode, ownerCode: context.Owner.OwnerCode }),
      DemoCorrelationId,
      `${DemoScreenPrefix}-REQ`,
      '127.0.0.1',
      'DEMO-DATA-LTA-SEED',
      'SUCCESS',
    ],
  );
};

export const AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows = async (manager: EntityManager): Promise<void> => {
  const auditRows = (await manager.query(
    `SELECT COUNT(*)::int AS "Count" FROM audit_logs WHERE id::text = ANY($1::text[]) OR correlation_id = $2`,
    [LegacyDemoDataCcScreenCoverageAuditLogIds, LegacyDemoCorrelationId],
  )) as Array<{ Count?: number | string }> | undefined;
  const overrideRows = (await manager.query(
    `SELECT COUNT(*)::int AS "Count" FROM override_logs WHERE id::text = ANY($1::text[]) OR correlation_id = $2 OR audit_ref = $2`,
    [LegacyDemoDataCcScreenCoverageOverrideLogIds, LegacyDemoCorrelationId],
  )) as Array<{ Count?: number | string }> | undefined;

  const auditCount = Number(auditRows?.[0]?.Count ?? 0);
  const overrideCount = Number(overrideRows?.[0]?.Count ?? 0);
  if (auditCount > 0 || overrideCount > 0) {
    throw new Error(
      `DEMO-DATA-LTA seed found legacy append-only audit/override rows (${auditCount} audit, ${overrideCount} override). Run yarn.cmd demo-data:prepare to clear local/dev DB before reseeding LTA demo data.`,
    );
  }
};

export const AssertDemoDataCcScreenCoverageCurrentAppendOnlyRows = async (manager: EntityManager): Promise<void> => {
  const linkage = BuildDemoDataCcScreenCoverageGovernanceLinkage();
  const overrideRows = (await manager.query(
    `SELECT rule_id AS "RuleId", actor_user_id AS "ActorUserId", target_object_type AS "TargetObjectType", target_object_id AS "TargetObjectId", target_object_code AS "TargetObjectCode", scope AS "Scope", control_mode AS "ControlMode", action AS "Action", before_json AS "BeforeJson", after_json AS "AfterJson", audit_ref AS "AuditRef", correlation_id AS "CorrelationId", evidence_refs AS "EvidenceRefs" FROM override_logs WHERE id = $1`,
    [DemoDataCcScreenCoverageOverrideLogId],
  )) as
    | Array<{
        RuleId?: string | null;
        ActorUserId?: string | null;
        Action?: string | null;
        TargetObjectType?: string | null;
        TargetObjectId?: string | null;
        TargetObjectCode?: string | null;
        Scope?: unknown;
        ControlMode?: string | null;
        BeforeJson?: unknown;
        AfterJson?: unknown;
        AuditRef?: string | null;
        CorrelationId?: string | null;
        EvidenceRefs?: unknown;
      }>
    | undefined;
  const auditRows = (await manager.query(
    `SELECT actor_user_id AS "ActorUserId", action AS "Action", object_type AS "ObjectType", object_id AS "ObjectId", object_code AS "ObjectCode", before_json AS "BeforeJson", after_json AS "AfterJson", reference_type AS "ReferenceType", reference_id AS "ReferenceId", warehouse_id AS "WarehouseId", owner_id AS "OwnerId", scope_json AS "ScopeJson", correlation_id AS "CorrelationId", request_id AS "RequestId", user_agent AS "UserAgent", evidence_refs AS "EvidenceRefs", result AS "Result" FROM audit_logs WHERE id = $1`,
    [DemoDataCcScreenCoverageAuditLogId],
  )) as
    | Array<{
        ActorUserId?: string | null;
        Action?: string | null;
        ObjectType?: string | null;
        ObjectId?: string | null;
        ObjectCode?: string | null;
        BeforeJson?: unknown;
        AfterJson?: unknown;
        ReferenceType?: string | null;
        ReferenceId?: string | null;
        WarehouseId?: string | null;
        OwnerId?: string | null;
        ScopeJson?: unknown;
        CorrelationId?: string | null;
        RequestId?: string | null;
        UserAgent?: string | null;
        EvidenceRefs?: unknown;
        Result?: string | null;
      }>
    | undefined;

  const overrideRow = RequiredAppendOnlyRow(overrideRows, 'override_logs', DemoDataCcScreenCoverageOverrideLogId);
  if (
    overrideRow.RuleId !== DemoRuleId ||
    !overrideRow.ActorUserId ||
    overrideRow.Action !== 'Override' ||
    overrideRow.TargetObjectType !== 'InboundPlan' ||
    overrideRow.TargetObjectId !== 'LTA-DEMO-WT01-INB' ||
    overrideRow.TargetObjectCode !== 'LTA-DEMO-WT01-INB' ||
    overrideRow.ControlMode !== 'APPROVAL_REQUIRED' ||
    !AppendOnlyJsonObjectMatches(overrideRow.Scope, { warehouseCode: 'LTA-HCM-01', ownerCode: 'LTA' }) ||
    !AppendOnlyJsonObjectMatches(overrideRow.BeforeJson, { allowed: false }) ||
    !AppendOnlyJsonObjectMatches(overrideRow.AfterJson, { allowed: true, overrideAccepted: true }) ||
    overrideRow.AuditRef !== linkage.OverrideAuditRef ||
    overrideRow.CorrelationId !== DemoCorrelationId ||
    !AppendOnlyEvidenceRefsInclude(overrideRow.EvidenceRefs, `${DemoScreenPrefix}:override`)
  ) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed found stale override log linkage for ${DemoDataCcScreenCoverageOverrideLogId}. Run yarn.cmd demo-data:prepare before reseeding.`,
    );
  }

  const auditRow = RequiredAppendOnlyRow(auditRows, 'audit_logs', DemoDataCcScreenCoverageAuditLogId);
  if (
    !auditRow.ActorUserId ||
    auditRow.Action !== 'Override' ||
    auditRow.ObjectType !== 'InboundPlan' ||
    auditRow.ObjectId !== 'LTA-DEMO-WT01-INB' ||
    auditRow.ObjectCode !== 'LTA-DEMO-WT01-INB' ||
    !auditRow.WarehouseId ||
    !auditRow.OwnerId ||
    !AppendOnlyJsonObjectMatches(auditRow.ScopeJson, { warehouseCode: 'LTA-HCM-01', ownerCode: 'LTA' }) ||
    !AppendOnlyJsonObjectMatches(auditRow.BeforeJson, { allowed: false }) ||
    !AppendOnlyJsonObjectMatches(auditRow.AfterJson, { allowed: true, overrideAccepted: true }) ||
    auditRow.ReferenceType !== linkage.AuditReferenceType ||
    auditRow.ReferenceId !== linkage.AuditReferenceId ||
    auditRow.CorrelationId !== DemoCorrelationId ||
    auditRow.RequestId !== `${DemoScreenPrefix}-REQ` ||
    auditRow.UserAgent !== 'DEMO-DATA-LTA-SEED' ||
    auditRow.Result !== 'SUCCESS' ||
    !AppendOnlyEvidenceRefsInclude(auditRow.EvidenceRefs, `${DemoScreenPrefix}:audit`)
  ) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed found stale audit log linkage for ${DemoDataCcScreenCoverageAuditLogId}. Run yarn.cmd demo-data:prepare before reseeding.`,
    );
  }
};

const RequiredAppendOnlyRow = <T>(rows: T[] | undefined, table: string, id: string): T => {
  if (!rows || rows.length !== 1) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires exactly one ${table} row for id ${id}.`);
  }

  return rows[0];
};

const AppendOnlyEvidenceRefsInclude = (value: unknown, expected: string): boolean =>
  Array.isArray(value) && value.includes(expected);

const AppendOnlyJsonObjectMatches = (value: unknown, expected: Record<string, unknown>): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return Object.entries(expected).every(([key, expectedValue]) => record[key] === expectedValue);
};

const RequiredByCode = async <T extends object>(
  repo: Repository<T>,
  codeField: keyof T & string,
  code: string,
): Promise<T> => {
  const entity = await repo.findOne({ where: { [codeField]: code } as never });
  if (!entity) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${repo.metadata.name}.${codeField}=${code}.`);
  }

  return entity;
};

const RequiredById = async <T extends object>(repo: Repository<T>, id: string): Promise<T> => {
  const entity = await repo.findOne({ where: { Id: id } as never });
  if (!entity) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${repo.metadata.name}.Id=${id}.`);
  }

  return entity;
};

const RequiredText = (value: string | null | undefined, label: string): string => {
  if (!value) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${label}.`);
  }

  return value;
};

export const AssertDemoDataCcScreenCoverageSourceConsistency = (
  input: DemoDataCcScreenCoverageSourceConsistencyInput,
): string => {
  if (
    input.PackageContent.SkuId !== input.PickTask.SkuId ||
    input.PackageContent.SkuId !== input.SourceDimension.SkuId
  ) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires matching WT-01 SKU across package, pick and source.`);
  }

  const packageUomId = RequiredText(input.PackageContent.UomId, 'WT-01 package content UOM');
  const pickUomId = RequiredText(input.PickTask.UomId, 'WT-01 pick task UOM');
  const sourceUomId = RequiredText(input.SourceDimension.UomId, 'WT-01 source dimension UOM');
  if (packageUomId !== pickUomId || packageUomId !== sourceUomId) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires matching WT-01 UOM across package, pick and source.`);
  }

  if (input.PickTask.SourceLocationId !== input.SourceDimension.LocationId) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires matching WT-01 source location.`);
  }

  const lpnCode = RequiredText(input.SourceDimension.LpnCode, 'WT-01 source dimension LpnCode');
  if (lpnCode !== DemoDataCcScreenCoverageLpnCode) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires WT-01 LPN ${DemoDataCcScreenCoverageLpnCode}; found ${lpnCode}.`,
    );
  }

  return lpnCode;
};

export const AssertDemoDataCcScreenCoverageStockIdentity = (input: { LotNumber: string; ExpiryDate: string }): void => {
  if (input.LotNumber !== DemoDataCcScreenCoverageLotNumber) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires WT-01 lot ${DemoDataCcScreenCoverageLotNumber}; found ${input.LotNumber}.`,
    );
  }

  if (input.ExpiryDate !== DemoDataCcScreenCoverageExpiryDate) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires WT-01 expiry ${DemoDataCcScreenCoverageExpiryDate}; found ${input.ExpiryDate}.`,
    );
  }
};

export const ResolveDemoDataCcScreenCoverageQuantity = (input: DemoDataCcScreenCoverageQuantityInput): number => {
  const quantity = Number(input.Quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires positive WT-01 quantity.`);
  }
  if (quantity !== DemoDataCcScreenCoverageScenarioQuantity) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires WT-01 quantity ${DemoDataCcScreenCoverageScenarioQuantity}; found ${quantity}.`,
    );
  }

  return quantity;
};

const RequireMatchingText = (values: Array<[string, string | null | undefined]>, label: string): string => {
  const normalized = values.map(([source, value]) => [source, RequiredText(value, `${label} ${source}`)] as const);
  const expected = normalized[0][1];
  const mismatch = normalized.find(([, value]) => value !== expected);
  if (mismatch) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires matching ${label}; ${mismatch[0]}=${mismatch[1]} differs from ${expected}.`,
    );
  }

  return expected;
};

const FormatDatePart = (value: number): string => value.toString().padStart(2, '0');

const FormatUtcDate = (value: Date): string =>
  `${value.getUTCFullYear()}-${FormatDatePart(value.getUTCMonth() + 1)}-${FormatDatePart(value.getUTCDate())}`;

const FormatLocalDate = (value: Date): string =>
  `${value.getFullYear()}-${FormatDatePart(value.getMonth() + 1)}-${FormatDatePart(value.getDate())}`;

const IsUtcMidnightDate = (value: Date): boolean =>
  value.getUTCHours() === 0 &&
  value.getUTCMinutes() === 0 &&
  value.getUTCSeconds() === 0 &&
  value.getUTCMilliseconds() === 0;

const AssertCalendarDate = (text: string, label: string): void => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!parts) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${label} as YYYY-MM-DD.`);
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${label} as valid date YYYY-MM-DD.`);
  }
};

export const FormatDemoDataCcScreenCoverageDate = (value: Date | string | null | undefined, label: string): string => {
  if (!value) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${label}.`);
  }

  if (typeof value === 'string') {
    AssertCalendarDate(value, label);
    return value;
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error(`DEMO-DATA-LTA screen coverage seed requires ${label} as valid date.`);
  }

  const text = IsUtcMidnightDate(value) ? FormatUtcDate(value) : FormatLocalDate(value);
  AssertCalendarDate(text, label);

  return text;
};

const RequireMatchingDate = (values: Array<[string, Date | string | null | undefined]>, label: string): string => {
  const normalized = values.map(
    ([source, value]) => [source, FormatDemoDataCcScreenCoverageDate(value, `${label} ${source}`)] as const,
  );
  const expected = normalized[0][1];
  const mismatch = normalized.find(([, value]) => value !== expected);
  if (mismatch) {
    throw new Error(
      `DEMO-DATA-LTA screen coverage seed requires matching ${label}; ${mismatch[0]}=${mismatch[1]} differs from ${expected}.`,
    );
  }

  return expected;
};

const SaveEntity = async <T extends object>(repo: Repository<T>, entity: DeepPartial<T>): Promise<T> =>
  await repo.save(repo.create(entity));

const AddMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60 * 1000);

const Hash = (value: string): string => createHash('sha256').update(value).digest('hex');
