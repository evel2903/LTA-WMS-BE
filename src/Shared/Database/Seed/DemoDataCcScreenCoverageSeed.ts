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
import { PackageOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

const DemoScreenPrefix = 'CC-SCREEN-DEMO';
const DemoAuditLogId = '11111111-1111-4111-8111-111111111105';
const DemoOverrideLogId = '11111111-1111-4111-8111-111111111305';
const DemoRuleId = '11111111-1111-4111-8111-111111111205';
const DemoCorrelationId = 'DEMO-DATA-CC-SCREEN-COVERAGE';
const DemoNow = new Date('2026-06-26T04:15:00.000Z');

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

const CleanupDemoDataCcScreenCoverage = async (manager: EntityManager): Promise<void> => {
  await manager.query(
    `DELETE FROM reprint_requests WHERE original_print_job_id IN (SELECT id FROM print_jobs WHERE job_code LIKE $1)`,
    [`PJ-${DemoScreenPrefix}%`],
  );
  await manager.query(`DELETE FROM print_jobs WHERE job_code LIKE $1`, [`PJ-${DemoScreenPrefix}%`]);
  await manager.query(
    `DELETE FROM label_template_versions WHERE template_id IN (SELECT id FROM label_templates WHERE template_code LIKE $1)`,
    [`LBL-${DemoScreenPrefix}%`],
  );
  await manager.query(`DELETE FROM label_templates WHERE template_code LIKE $1`, [`LBL-${DemoScreenPrefix}%`]);
  await manager.query(
    `DELETE FROM mobile_scan_events WHERE task_id IN (SELECT id FROM mobile_tasks WHERE task_code LIKE $1)`,
    [`MT-${DemoScreenPrefix}%`],
  );
  await manager.query(`DELETE FROM mobile_tasks WHERE task_code LIKE $1`, [`MT-${DemoScreenPrefix}%`]);
  await manager.query(`DELETE FROM replenishment_tasks WHERE task_code LIKE $1`, [`RP-${DemoScreenPrefix}%`]);
  await manager.query(`DELETE FROM cycle_count_works WHERE count_code LIKE $1`, [`CCW-${DemoScreenPrefix}%`]);
  await manager.query(`DELETE FROM exception_cases WHERE reference_id LIKE $1`, [`${DemoScreenPrefix}%`]);
  await manager.query(`DELETE FROM approval_requests WHERE correlation_id = $1`, [DemoCorrelationId]);
};

const BuildContext = async (manager: EntityManager): Promise<ScreenCoverageContext> => {
  const actor = await RequiredByCode(manager.getRepository(UserOrmEntity), 'EmailAddress', 'admin@example.com');
  const owner = await RequiredByCode(manager.getRepository(OwnerOrmEntity), 'OwnerCode', 'CCVN');
  const warehouse = await RequiredByCode(manager.getRepository(WarehouseOrmEntity), 'WarehouseCode', 'CC-HCM-01');
  const sourceBalance = await RequiredByCode(
    manager.getRepository(InventoryBalanceOrmEntity),
    'ReferenceId',
    'CC-LPN-0001',
  );
  const sourceDimension = await RequiredById(
    manager.getRepository(InventoryDimensionOrmEntity),
    sourceBalance.DimensionId,
  );
  const sku = await RequiredById(manager.getRepository(SkuOrmEntity), sourceDimension.SkuId);
  const location = await RequiredById(manager.getRepository(LocationOrmEntity), sourceDimension.LocationId);
  const inventoryStatus = await RequiredById(
    manager.getRepository(InventoryStatusOrmEntity),
    sourceDimension.InventoryStatusId,
  );
  const uom = sourceDimension.UomId
    ? await RequiredById(manager.getRepository(UomOrmEntity), sourceDimension.UomId)
    : null;
  const reason =
    (await manager.getRepository(ReasonCodeOrmEntity).findOne({ where: { ReasonCode: 'DEMO_ACCEPTANCE' } })) ??
    (await manager.getRepository(ReasonCodeOrmEntity).findOne({ where: { Status: 'ACTIVE' } }));
  const pickTask = await RequiredByCode(manager.getRepository(PickTaskOrmEntity), 'TaskNumber', 'PT-CC-DEMO-WT06');
  const packageEntity = await RequiredByCode(
    manager.getRepository(PackageOrmEntity),
    'PackageCode',
    'PKG-CC-DEMO-WT06',
  );

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
    Rule: {
      Id: DemoRuleId,
      RuleCode: 'CC-DEMO-OVERRIDE-READINESS',
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
    TemplateName: 'Tem LPN demo Coca-Cola',
    LabelType: 'LPN',
    Status: LabelTemplateStatus.Active,
    RequiredFields: ['skuCode', 'lpnCode', 'lotNumber', 'expiryDate'],
    TemplateBody: 'COCA-COLA {{skuCode}} / {{lpnCode}} / {{lotNumber}} / {{expiryDate}}',
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
    TemplateBody: 'COCA-COLA {{skuCode}} / {{lpnCode}} / {{lotNumber}} / {{expiryDate}}',
    RequiredFields: ['skuCode', 'lpnCode', 'lotNumber', 'expiryDate'],
    Status: LabelTemplateStatus.Active,
    CreatedAt: DemoNow,
    CreatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(PrintJobOrmEntity), {
    Id: printJobId,
    JobCode: `PJ-${DemoScreenPrefix}-WT06-LPN`,
    TemplateId: templateId,
    TemplateVersionId: templateVersionId,
    BusinessObjectType: 'Package',
    BusinessObjectId: context.Package.Id,
    BusinessObjectCode: context.Package.PackageCode,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    PayloadJson: {
      skuCode: context.Sku.SkuCode,
      lpnCode: 'CC-FLOW-LPN-WT06',
      lotNumber: 'CC-FLOW-BATCH-WT06',
      expiryDate: '2026-09-30',
    },
    PreviewContent: 'COCA-COLA CC-SPRITE-330-CAN / CC-FLOW-LPN-WT06 / CC-FLOW-BATCH-WT06 / 2026-09-30',
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
    TaskCode: `MT-${DemoScreenPrefix}-PICK-WT06`,
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
      lpnCode: 'CC-FLOW-LPN-WT06',
    },
    CreatedAt: AddMinutes(DemoNow, 3),
    CreatedBy: context.Actor.Id,
    UpdatedAt: AddMinutes(DemoNow, 4),
    UpdatedBy: context.Actor.Id,
  });
  await SaveEntity(manager.getRepository(MobileScanEventOrmEntity), {
    Id: randomUUID(),
    TaskId: taskId,
    TaskCode: `MT-${DemoScreenPrefix}-PICK-WT06`,
    WarehouseId: context.Warehouse.Id,
    OwnerId: context.Owner.Id,
    ScanType: MobileScanType.Lpn,
    RawValue: 'CC-FLOW-LPN-WT06',
    NormalizedValue: 'CC-FLOW-LPN-WT06',
    Result: MobileScanResult.Accepted,
    ResolvedObjectType: 'PickTask',
    ResolvedObjectId: context.PickTask.Id,
    ParsedValueJson: { lpnCode: 'CC-FLOW-LPN-WT06', scenario: 'WT-06' },
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
    Quantity: 24,
    ShortPickReference: 'DEMO-DATA-CC-SHORT-PICK',
    Priority: 30,
    WorkPoolCode: 'CC-DEMO-REPLENISH',
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

  return { ApprovalRequestCount: 1, AuditLogCount: 1, OverrideLogCount: 1, ExceptionCaseCount: 1 };
};

const InsertOverrideLogOnce = async (manager: EntityManager, context: ScreenCoverageContext): Promise<void> => {
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
      DemoOverrideLogId,
      context.Rule.Id,
      context.Rule.RuleCode,
      context.Actor.Id,
      'InboundPlan',
      'CC-DEMO-WT01-INB',
      'CC-DEMO-WT01-INB',
      JSON.stringify({ warehouseCode: context.Warehouse.WarehouseCode, ownerCode: context.Owner.OwnerCode }),
      context.Rule.ControlMode,
      'Override',
      context.Reason?.Id ?? null,
      'Demo override readiness để minh họa governance.',
      JSON.stringify([`${DemoScreenPrefix}:override`]),
      null,
      JSON.stringify({ allowed: false }),
      JSON.stringify({ allowed: true, overrideAccepted: true }),
      DemoAuditLogId,
      DemoCorrelationId,
      AddMinutes(DemoNow, 9),
      context.Actor.Id,
    ],
  );
};

const InsertAuditLogOnce = async (manager: EntityManager, context: ScreenCoverageContext): Promise<void> => {
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
      DemoAuditLogId,
      AddMinutes(DemoNow, 9),
      context.Actor.Id,
      JSON.stringify(['WMS_ADMIN']),
      'USER',
      'Override',
      'InboundPlan',
      'CC-DEMO-WT01-INB',
      'CC-DEMO-WT01-INB',
      JSON.stringify({ allowed: false }),
      JSON.stringify({ allowed: true, overrideAccepted: true }),
      context.Reason?.Id ?? null,
      'Demo audit log cho screen coverage.',
      JSON.stringify([`${DemoScreenPrefix}:audit`]),
      'OverrideLog',
      DemoCorrelationId,
      context.Warehouse.Id,
      context.Owner.Id,
      JSON.stringify({ warehouseCode: context.Warehouse.WarehouseCode, ownerCode: context.Owner.OwnerCode }),
      DemoCorrelationId,
      `${DemoScreenPrefix}-REQ`,
      '127.0.0.1',
      'DEMO-DATA-CC-SEED',
      'SUCCESS',
    ],
  );
};

const RequiredByCode = async <T extends object>(
  repo: Repository<T>,
  codeField: keyof T & string,
  code: string,
): Promise<T> => {
  const entity = await repo.findOne({ where: { [codeField]: code } as never });
  if (!entity) {
    throw new Error(`DEMO-DATA-CC screen coverage seed requires ${repo.metadata.name}.${codeField}=${code}.`);
  }

  return entity;
};

const RequiredById = async <T extends object>(repo: Repository<T>, id: string): Promise<T> => {
  const entity = await repo.findOne({ where: { Id: id } as never });
  if (!entity) {
    throw new Error(`DEMO-DATA-CC screen coverage seed requires ${repo.metadata.name}.Id=${id}.`);
  }

  return entity;
};

const SaveEntity = async <T extends object>(repo: Repository<T>, entity: DeepPartial<T>): Promise<T> =>
  await repo.save(repo.create(entity));

const AddMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60 * 1000);

const Hash = (value: string): string => createHash('sha256').update(value).digest('hex');
