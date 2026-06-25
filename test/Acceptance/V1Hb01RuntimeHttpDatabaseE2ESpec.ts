import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe, VersioningType, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '@app/App.module';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { GoodsIssueStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueStatus';
import { GoodsIssueTriggerStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueTriggerStatus';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';

jest.setTimeout(180_000);

const RUN_RUNTIME_E2E = process.env.V1_HB_RUNTIME_E2E === '1';
const describeRuntime = RUN_RUNTIME_E2E ? describe : describe.skip;
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
const FORBIDDEN_INVENTORY_STATUS_TERMS = [
  'SHIPPED',
  'GATE_OUT',
  'GOODS_ISSUE_POSTED',
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

type ApiEnvelope<T> = {
  Success: boolean;
  Data: T;
};

type RuntimeFixture = {
  Prefix: string;
  WarehouseTypeCode: 'WT-01' | 'WT-05' | 'WT-06';
  SiteId: string;
  WarehouseId: string;
  WarehouseCode: string;
  ZoneId: string;
  LocationProfileId: string;
  LocationId: string;
  LocationCode: string;
  OwnerId: string;
  OwnerCode: string;
  OtherOwnerId: string;
  OtherOwnerCode: string;
  UomId: string;
  UomCode: string;
  SkuId: string;
  SkuCode: string;
  WarehouseProfileId: string;
  WarehouseProfileCode: string;
  InventoryStatusId: string;
  InventoryStatusCode: string;
  DimensionId: string;
  BalanceId: string;
  OutboundOrderId: string;
  OutboundOrderLineId: string;
  AllocationId: string;
  AllocationLineId: string;
  PickReleaseId: string;
  PickTaskId: string;
  MobileTaskId: string;
  Quantity: number;
};

type ShippingRuntimeDto = {
  Id: string;
  Status: string;
  GoodsIssueStatus?: string | null;
  GoodsIssueInventoryTransactionId?: string | null;
  GoodsIssueOutboxMessageId?: string | null;
  GoodsIssueTrigger?: string | null;
  GoodsIssueTriggerStatus?: string | null;
  [key: string]: unknown;
};

describeRuntime('V1-HB-01 runtime HTTP/database E2E WT-01/WT-05/WT-06', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminUserId = '';
  const deniedUserId = randomUUID();
  const cleanupPrefixes: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; user?: unknown }>();
          req.user =
            req.headers['x-test-user'] === 'denied'
              ? { UserId: deniedUserId, Role: 'Operator' }
              : { UserId: adminUserId, Role: 'Admin' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalInterceptors(app.get(ResponseInterceptor));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version', defaultVersion: '1' });
    await app.init();

    dataSource = app.get(DataSource);
    adminUserId = await loadSeedAdminUserId(dataSource);
    await assertCoreSeedsReady(dataSource, adminUserId);
  });

  afterAll(async () => {
    const cleanupErrors: string[] = [];
    try {
      if (dataSource?.isInitialized) {
        for (const prefix of cleanupPrefixes.reverse()) {
          try {
            await cleanupRuntimeFixture(dataSource, prefix);
          } catch (error) {
            cleanupErrors.push(`${prefix}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } finally {
      await app?.close();
    }
    if (cleanupErrors.length > 0) {
      throw new Error(`V1-HB-01 fixture cleanup failed: ${cleanupErrors.join('; ')}`);
    }
  });

  it('WT-01 chạy inbound import tới goods issue qua HTTP thật và ghi DB evidence đầy đủ', async () => {
    const fixture = await createRuntimeFixture(dataSource, 'WT-01', {});
    cleanupPrefixes.push(fixture.Prefix);

    await postSuccess<unknown>('/integration/imports', {
      BatchReference: `${fixture.Prefix}-WT01-INBOUND-BATCH`,
      Messages: [
        integrationEnvelope(fixture, {
          MessageId: `${fixture.Prefix}-inbound-import`,
          MessageType: 'InboundPlanReceived',
          BusinessReference: `${fixture.Prefix}-WT01-INBOUND-TO-GI`,
          Payload: { ExpectedQuantity: fixture.Quantity, ActualQuantity: fixture.Quantity },
        }),
      ],
    });

    const staged = await runPackingAndShippingFlow(fixture, { ShipmentReference: `${fixture.Prefix}-SHIP-WT01` });
    expect(staged.GoodsIssueStatus).toBe(GoodsIssueStatus.Posted);
    expect(staged.GoodsIssueTrigger).toBe('at_loading');
    expect(staged.GoodsIssueTriggerStatus).toBe(GoodsIssueTriggerStatus.Ready);
    expect(staged.InventoryStatusCode).toBe('LOADED');

    const interfaceMessages = await dataSource.getRepository(InterfaceMessageOrmEntity).find({
      where: { BusinessReference: `${fixture.Prefix}-WT01-INBOUND-TO-GI` },
    });
    expect(interfaceMessages).toHaveLength(1);

    const goodsIssueOutbox = await dataSource.getRepository(OutboxMessageOrmEntity).findOne({
      where: { EventType: 'GoodsIssuePosted', BusinessReference: `${fixture.Prefix}-SHIP-WT01` },
    });
    expect(goodsIssueOutbox).toMatchObject({
      WarehouseContext: fixture.WarehouseCode,
      OwnerContext: fixture.OwnerCode,
      Status: 'Pending',
    });

    const goodsIssueTransactionId = staged.GoodsIssueInventoryTransactionId;
    expect(goodsIssueTransactionId).toBeTruthy();
    const transaction = await dataSource.getRepository(InventoryTransactionOrmEntity).findOneByOrFail({
      Id: goodsIssueTransactionId!,
    });
    expect(transaction.TransactionType).toBe(InventoryTransactionType.GoodsIssue);
    expect(transaction.OwnerId).toBe(fixture.OwnerId);
    expect(transaction.WarehouseId).toBe(fixture.WarehouseId);
    expect(Number(transaction.Quantity)).toBe(fixture.Quantity);

    await expectAuditEvidence(dataSource, fixture, ['IntegrationMessage', 'Shipment', 'GoodsIssue']);
    await expectForbiddenInventoryStatusesAbsent(dataSource);
  });

  it('WT-05 giữ owner segregation qua goods issue, event và reconciliation scope', async () => {
    const fixture = await createRuntimeFixture(dataSource, 'WT-05', {});
    cleanupPrefixes.push(fixture.Prefix);

    await dataSource.getRepository(InventoryDimensionOrmEntity).update(fixture.DimensionId, {
      OwnerId: fixture.OtherOwnerId,
      ReferenceId: `${fixture.Prefix}-cross-owner-negative`,
    });
    const staged = await runPackingAndShippingFlow(fixture, {
      ShipmentReference: `${fixture.Prefix}-SHIP-WT05`,
      SkipGoodsIssue: true,
    });

    await postRaw(`/shipping/staging/packages/${staged.Id}/goods-issue`, {
      ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      EvidenceRefs: [`${fixture.Prefix}:cross-owner-denied`],
      IdempotencyKey: `${fixture.Prefix}-gi-cross-owner-denied`,
    }).expect(400);

    const deniedAudit = await dataSource.getRepository(AuditLogOrmEntity).findOne({
      where: {
        ObjectType: 'GoodsIssue',
        ReferenceType: 'GoodsIssueGate',
        Result: 'FAILED',
        WarehouseId: fixture.WarehouseId,
        OwnerId: fixture.OwnerId,
      },
      order: { OccurredAt: 'DESC' },
    });
    expect(deniedAudit?.AfterJson).toEqual(
      expect.objectContaining({
        Reason: 'Goods Issue source inventory owner does not match shipment owner',
      }),
    );

    await dataSource.getRepository(InventoryDimensionOrmEntity).update(fixture.DimensionId, {
      OwnerId: fixture.OwnerId,
      ReferenceId: `${fixture.Prefix}-owner-restored`,
    });
    const posted = await postSuccess<Record<string, unknown>>(`/shipping/staging/packages/${staged.Id}/goods-issue`, {
      ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      EvidenceRefs: [`${fixture.Prefix}:owner-restored-gi`],
      IdempotencyKey: `${fixture.Prefix}-gi-owner-restored`,
    });
    expect(posted.GoodsIssueStatus).toBe(GoodsIssueStatus.Posted);

    const businessReference = `${fixture.Prefix}-WT05-OWNER-RECON`;
    const ownerAEnvelope = integrationEnvelope(fixture, {
      MessageId: `${fixture.Prefix}-owner-a-event`,
      MessageType: 'GoodsIssuePosted',
      BusinessReference: businessReference,
      Payload: { ExpectedQuantity: 12, ActualQuantity: 10 },
    });
    const ownerAEvent = await postSuccess<{ Id: string; IsDuplicate: boolean }>('/integration/events', ownerAEnvelope);
    const ownerAEventDuplicate = await postSuccess<{ Id: string; IsDuplicate: boolean }>(
      '/integration/events',
      ownerAEnvelope,
    );
    expect(ownerAEventDuplicate).toMatchObject({ Id: ownerAEvent.Id, IsDuplicate: true });
    const ownerAOutboxRows = await dataSource.getRepository(OutboxMessageOrmEntity).count({
      where: { MessageId: ownerAEnvelope.MessageId },
    });
    expect(ownerAOutboxRows).toBe(1);
    await postSuccess<unknown>('/integration/events', {
      ...integrationEnvelope(fixture, {
        MessageId: `${fixture.Prefix}-owner-b-event`,
        MessageType: 'GoodsIssuePosted',
        BusinessReference: businessReference,
        OwnerContext: fixture.OtherOwnerCode,
        Payload: { ExpectedQuantity: 12, ActualQuantity: 7 },
      }),
    });

    const reconciliation = await postSuccess<{
      Run: { Id: string; SourceCounts: Record<string, number>; ItemCount: number };
      Items: Array<{ SourceId: string; MismatchType: string }>;
    }>('/integration/reconciliation/runs', {
      BusinessReference: businessReference,
      WarehouseId: fixture.WarehouseCode,
      OwnerId: fixture.OwnerCode,
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: [`${fixture.Prefix}:owner-reconciliation`],
      IdempotencyKey: `${fixture.Prefix}-owner-reconciliation`,
    });

    expect(reconciliation.Run.SourceCounts.OutboxMessages).toBe(1);
    expect(reconciliation.Items).toHaveLength(1);
    expect(reconciliation.Items[0]).toMatchObject({
      SourceId: `${fixture.Prefix}-owner-a-event`,
      MismatchType: 'QuantityMismatch',
    });
    const persistedRun = await dataSource.getRepository(IntegrationReconciliationRunOrmEntity).findOneByOrFail({
      Id: reconciliation.Run.Id,
    });
    expect(persistedRun.OwnerId).toBe(fixture.OwnerCode);
  });

  it('WT-06 chạy pick/pack/label/loading và chờ gate-out trước goods issue trigger', async () => {
    const fixture = await createRuntimeFixture(dataSource, 'WT-06', { goodsIssueTrigger: 'at_gate_out' });
    cleanupPrefixes.push(fixture.Prefix);

    const session = await postSuccess<{ Id: string; CheckRequired: boolean; Status: string }>('/packing/sessions', {
      PickTaskId: fixture.PickTaskId,
      MobileTaskId: fixture.MobileTaskId,
      WarehouseProfileId: fixture.WarehouseProfileId,
      CheckRequired: true,
      ReasonCode: 'RC-V1-DISCREPANCY',
      EvidenceRefs: [`${fixture.Prefix}:pack-session`],
      IdempotencyKey: `${fixture.Prefix}-pack-session`,
    });
    expect(session.CheckRequired).toBe(true);

    const checked = await postSuccess<{ CheckResult: string }>(`/packing/sessions/${session.Id}/check`, {
      CheckResult: PackageCheckResult.Passed,
      ReasonCode: 'RC-V1-DISCREPANCY',
      EvidenceRefs: [`${fixture.Prefix}:pack-check-pass`],
      IdempotencyKey: `${fixture.Prefix}-pack-check`,
    });
    expect(checked.CheckResult).toBe(PackageCheckResult.Passed);

    const pack = await postSuccess<{ Id: string; Status: string; Contents: Array<{ InventoryStatusCode: string }> }>(
      '/packing/packages',
      {
        PackSessionId: session.Id,
        CartonType: 'CTN-HB01',
        Weight: 3.5,
        EvidenceRefs: [`${fixture.Prefix}:package-create`],
        IdempotencyKey: `${fixture.Prefix}-package-create`,
      },
    );
    expect(pack.Contents[0].InventoryStatusCode).toBe('PICKED');

    await postSuccess<unknown>(`/packing/packages/${pack.Id}/close`, {
      EvidenceRefs: [`${fixture.Prefix}:package-close`],
      IdempotencyKey: `${fixture.Prefix}-package-close`,
    });
    const ready = await postSuccess<{ Package: { Status: string; LabelBlockingDecision: string | null } }>(
      `/packing/packages/${pack.Id}/ready-for-staging`,
      {
        LabelType: 'SSCC',
        EvidenceRefs: [`${fixture.Prefix}:label-preview-not-required`],
        IdempotencyKey: `${fixture.Prefix}-ready-for-staging`,
      },
    );
    expect(ready.Package.Status).toBe(PackageStatus.ReadyForStaging);

    const staged = await postSuccess<{ Id: string; Status: string }>('/shipping/staging/packages', {
      PackageId: pack.Id,
      ShipmentReference: `${fixture.Prefix}-SHIP-WT06`,
      StagingLaneCode: 'STAGE-WT06',
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:stage`],
      IdempotencyKey: `${fixture.Prefix}-stage-package`,
    });
    expect(staged.Status).toBe(ShipmentPackageStagingStatus.Staged);

    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/dock`, {
      DockDoorCode: `${fixture.Prefix}-DOCK`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:dock-assigned`],
      IdempotencyKey: `${fixture.Prefix}-dock`,
    });
    const readyForLoading = await postSuccess<{ Status: string }>(`/shipping/staging/packages/${staged.Id}/truck`, {
      TruckReference: `${fixture.Prefix}-TRUCK-WT06`,
      VehicleNumber: `${fixture.Prefix}-VEH-WT06`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:truck-assigned`],
      IdempotencyKey: `${fixture.Prefix}-truck`,
    });
    expect(readyForLoading.Status).toBe(ShipmentPackageStagingStatus.ReadyForLoading);

    const loaded = await postSuccess<{ GoodsIssueTrigger: string; GoodsIssueTriggerStatus: string }>(
      `/shipping/staging/packages/${staged.Id}/loading`,
      {
        ScannedPackageId: pack.Id,
        ShipmentReference: `${fixture.Prefix}-SHIP-WT06`,
        LoadReference: `${fixture.Prefix}-LOAD-WT06`,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        EvidenceRefs: [`${fixture.Prefix}:loading-scan`],
        IdempotencyKey: `${fixture.Prefix}-loading`,
      },
    );
    expect(loaded.GoodsIssueTrigger).toBe('at_gate_out');
    expect(loaded.GoodsIssueTriggerStatus).toBe(GoodsIssueTriggerStatus.Pending);

    await postRaw(`/shipping/staging/packages/${staged.Id}/goods-issue-trigger`, {
      GoodsIssueTrigger: 'at_gate_out',
      ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      EvidenceRefs: [`${fixture.Prefix}:trigger-before-gate-out-denied`],
      IdempotencyKey: `${fixture.Prefix}-trigger-before-gate-out`,
    }).expect(400);

    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/confirm`, {
      ShipmentReference: `${fixture.Prefix}-SHIP-WT06`,
      RequireFullLoad: true,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:shipment-confirmed`],
      IdempotencyKey: `${fixture.Prefix}-confirm`,
    });
    const gated = await postSuccess<{ GoodsIssueTriggerStatus: string; Status: string }>(
      `/shipping/staging/packages/${staged.Id}/gate-out`,
      {
        GateOutReference: `${fixture.Prefix}-GATE-OUT`,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        EvidenceRefs: [`${fixture.Prefix}:gate-out`],
        IdempotencyKey: `${fixture.Prefix}-gate-out`,
      },
    );
    expect(gated.Status).toBe(ShipmentPackageStagingStatus.GateOutRecorded);
    expect(gated.GoodsIssueTriggerStatus).toBe(GoodsIssueTriggerStatus.Ready);

    const posted = await postSuccess<{ GoodsIssueStatus: string; GoodsIssueOutboxMessageId: string }>(
      `/shipping/staging/packages/${staged.Id}/goods-issue`,
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: [`${fixture.Prefix}:goods-issue`],
        IdempotencyKey: `${fixture.Prefix}-goods-issue`,
      },
    );
    expect(posted.GoodsIssueStatus).toBe(GoodsIssueStatus.Posted);
    expect(posted.GoodsIssueOutboxMessageId).toBeTruthy();
  });

  it('permission guard ghi nhận deny path trên runtime HTTP mutation', async () => {
    const fixture = await createRuntimeFixture(dataSource, 'WT-01', {});
    cleanupPrefixes.push(fixture.Prefix);

    await postRaw(
      '/integration/events',
      integrationEnvelope(fixture, {
        MessageId: `${fixture.Prefix}-denied-event`,
        MessageType: 'GoodsIssuePosted',
        BusinessReference: `${fixture.Prefix}-DENIED`,
        Payload: { ExpectedQuantity: 1, ActualQuantity: 1 },
      }),
      'denied',
    ).expect(403);

    const deniedAudit = await dataSource.getRepository(AuditLogOrmEntity).findOne({
      where: {
        ActorUserId: deniedUserId,
        ObjectType: 'IntegrationMessage',
        ReferenceType: 'PermissionGuard',
        Result: 'FAILED',
      },
      order: { OccurredAt: 'DESC' },
    });
    expect(deniedAudit?.AfterJson).toEqual(
      expect.objectContaining({ Decision: 'Denied', ObjectType: 'IntegrationMessage' }),
    );
  });

  async function runPackingAndShippingFlow(
    fixture: RuntimeFixture,
    options: { ShipmentReference: string; SkipGoodsIssue?: boolean },
  ): Promise<ShippingRuntimeDto> {
    const session = await postSuccess<{ Id: string }>('/packing/sessions', {
      PickTaskId: fixture.PickTaskId,
      MobileTaskId: fixture.MobileTaskId,
      WarehouseProfileId: fixture.WarehouseProfileId,
      CheckRequired: false,
      ReasonCode: 'RC-V1-DISCREPANCY',
      EvidenceRefs: [`${fixture.Prefix}:pack-session`],
      IdempotencyKey: `${fixture.Prefix}-pack-session`,
    });
    const pack = await postSuccess<{ Id: string }>('/packing/packages', {
      PackSessionId: session.Id,
      CartonType: 'CTN-HB01',
      EvidenceRefs: [`${fixture.Prefix}:package-create`],
      IdempotencyKey: `${fixture.Prefix}-package-create`,
    });
    await postSuccess<unknown>(`/packing/packages/${pack.Id}/close`, {
      EvidenceRefs: [`${fixture.Prefix}:package-close`],
      IdempotencyKey: `${fixture.Prefix}-package-close`,
    });
    await postSuccess<unknown>(`/packing/packages/${pack.Id}/ready-for-staging`, {
      EvidenceRefs: [`${fixture.Prefix}:ready-for-staging`],
      IdempotencyKey: `${fixture.Prefix}-ready-for-staging`,
    });

    const staged = await postSuccess<{ Id: string }>('/shipping/staging/packages', {
      PackageId: pack.Id,
      ShipmentReference: options.ShipmentReference,
      StagingLaneCode: 'STAGE-HB01',
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:stage`],
      IdempotencyKey: `${fixture.Prefix}-stage-package`,
    });
    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/dock`, {
      DockDoorCode: `${fixture.Prefix}-DOCK`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:dock-assigned`],
      IdempotencyKey: `${fixture.Prefix}-dock`,
    });
    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/truck`, {
      TruckReference: `${fixture.Prefix}-TRUCK`,
      VehicleNumber: `${fixture.Prefix}-VEH`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:truck-assigned`],
      IdempotencyKey: `${fixture.Prefix}-truck`,
    });
    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/loading`, {
      ScannedPackageId: pack.Id,
      ShipmentReference: options.ShipmentReference,
      LoadReference: `${fixture.Prefix}-LOAD`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:loading`],
      IdempotencyKey: `${fixture.Prefix}-loading`,
    });
    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/confirm`, {
      ShipmentReference: options.ShipmentReference,
      RequireFullLoad: true,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:confirm`],
      IdempotencyKey: `${fixture.Prefix}-confirm`,
    });
    await postSuccess<unknown>(`/shipping/staging/packages/${staged.Id}/gate-out`, {
      GateOutReference: `${fixture.Prefix}-GATE-OUT`,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [`${fixture.Prefix}:gate-out`],
      IdempotencyKey: `${fixture.Prefix}-gate-out`,
    });

    if (options.SkipGoodsIssue) {
      return await getSuccess<ShippingRuntimeDto>(`/shipping/staging/packages/${staged.Id}`);
    }
    return await postSuccess<ShippingRuntimeDto>(`/shipping/staging/packages/${staged.Id}/goods-issue`, {
      ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      EvidenceRefs: [`${fixture.Prefix}:goods-issue`],
      IdempotencyKey: `${fixture.Prefix}-goods-issue`,
    });
  }

  async function postSuccess<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await postRaw(path, body).expect((res) => {
      if (res.status < 200 || res.status > 299) {
        throw new Error(`${path} failed ${res.status}: ${JSON.stringify(res.body)}`);
      }
    });
    expect((response.body as ApiEnvelope<T>).Success).toBe(true);
    return (response.body as ApiEnvelope<T>).Data;
  }

  async function getSuccess<T>(path: string): Promise<T> {
    const response = await request(app.getHttpServer()).get(path).set('X-API-Version', '1').expect(200);
    expect((response.body as ApiEnvelope<T>).Success).toBe(true);
    return (response.body as ApiEnvelope<T>).Data;
  }

  function postRaw(path: string, body: Record<string, unknown>, user: 'admin' | 'denied' = 'admin') {
    return request(app.getHttpServer()).post(path).set('X-API-Version', '1').set('x-test-user', user).send(body);
  }
});

async function loadSeedAdminUserId(dataSource: DataSource): Promise<string> {
  const admin = await dataSource.getRepository(UserOrmEntity).findOne({ where: { EmailAddress: ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(`V1-HB-01 requires seeded admin ${ADMIN_EMAIL}. Run: yarn.cmd db:prepare`);
  }
  return admin.Id;
}

async function assertCoreSeedsReady(dataSource: DataSource, adminUserId: string): Promise<void> {
  await dataSource.getRepository(InventoryStatusOrmEntity).findOneByOrFail({ StatusCode: 'PICKED' });
  const adminRoles = await dataSource.query(
    `
      SELECT r.role_code
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.role_code = 'WMS_ADMIN'
    `,
    [adminUserId],
  );
  if (adminRoles.length === 0) {
    throw new Error(`V1-HB-01 requires WMS_ADMIN role assignment for ${ADMIN_EMAIL}. Run: yarn.cmd db:prepare`);
  }
}

async function createRuntimeFixture(
  dataSource: DataSource,
  warehouseTypeCode: RuntimeFixture['WarehouseTypeCode'],
  strategyPolicy: Record<string, unknown>,
): Promise<RuntimeFixture> {
  const short = randomUUID().slice(0, 8).toUpperCase();
  const prefix = `HB01-${warehouseTypeCode}-${short}`;
  const ids = {
    SiteId: randomUUID(),
    WarehouseId: randomUUID(),
    ZoneId: randomUUID(),
    LocationProfileId: randomUUID(),
    LocationId: randomUUID(),
    OwnerId: randomUUID(),
    OtherOwnerId: randomUUID(),
    UomId: randomUUID(),
    SkuId: randomUUID(),
    WarehouseProfileId: randomUUID(),
    DimensionId: randomUUID(),
    BalanceId: randomUUID(),
    OutboundOrderId: randomUUID(),
    OutboundOrderLineId: randomUUID(),
    AllocationId: randomUUID(),
    AllocationLineId: randomUUID(),
    PickReleaseId: randomUUID(),
    PickTaskId: randomUUID(),
    MobileTaskId: randomUUID(),
  };
  const now = new Date();
  const inventoryStatus = await dataSource
    .getRepository(InventoryStatusOrmEntity)
    .findOneByOrFail({ StatusCode: 'PICKED' });
  const quantity = 6;
  const fixture: RuntimeFixture = {
    Prefix: prefix,
    WarehouseTypeCode: warehouseTypeCode,
    ...ids,
    WarehouseCode: `WH-${short}`,
    LocationCode: `LOC-${short}`,
    OwnerCode: `OWN-${short}`,
    OtherOwnerCode: `OWNX-${short}`,
    UomCode: `EA-${short}`,
    SkuCode: `SKU-${short}`,
    WarehouseProfileCode: `WP-${short}`,
    InventoryStatusId: inventoryStatus.Id,
    InventoryStatusCode: inventoryStatus.StatusCode,
    Quantity: quantity,
  };

  return await cleanupCreatedFixtureOnError(dataSource, prefix, async () => {
    await save(dataSource.getRepository(SiteOrmEntity), {
      Id: fixture.SiteId,
      SiteCode: `SITE-${short}`,
      SiteName: `${prefix} Site`,
      Status: MasterDataStatus.Active,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(OwnerOrmEntity), {
      Id: fixture.OwnerId,
      OwnerCode: fixture.OwnerCode,
      OwnerName: `${prefix} Owner`,
      Status: MasterDataStatus.Active,
      BillingPolicy: {},
      VisibilityScope: {},
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(OwnerOrmEntity), {
      Id: fixture.OtherOwnerId,
      OwnerCode: fixture.OtherOwnerCode,
      OwnerName: `${prefix} Other Owner`,
      Status: MasterDataStatus.Active,
      BillingPolicy: {},
      VisibilityScope: {},
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(WarehouseOrmEntity), {
      Id: fixture.WarehouseId,
      SiteId: fixture.SiteId,
      WarehouseCode: fixture.WarehouseCode,
      WarehouseName: `${prefix} Warehouse`,
      WarehouseTypeCode: warehouseTypeCode,
      Status: MasterDataStatus.Active,
      Timezone: 'Asia/Bangkok',
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(ZoneOrmEntity), {
      Id: fixture.ZoneId,
      WarehouseId: fixture.WarehouseId,
      ZoneCode: `ZN-${short}`,
      ZoneName: `${prefix} Zone`,
      ZoneType: 'STORAGE',
      Status: MasterDataStatus.Active,
      Sequence: 1,
      ComplianceFlags: {},
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(LocationProfileOrmEntity), {
      Id: fixture.LocationProfileId,
      ProfileCode: `LP-${short}`,
      ProfileName: `${prefix} Location Profile`,
      LocationType: 'PICK_FACE',
      Version: 1,
      Status: MasterDataStatus.Active,
      CapacityPolicy: {},
      EligibilityPolicy: {},
      MixPolicy: {},
      CompliancePolicy: {},
      OperationPolicy: {},
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(LocationOrmEntity), {
      Id: fixture.LocationId,
      WarehouseId: fixture.WarehouseId,
      ZoneId: fixture.ZoneId,
      ParentLocationId: null,
      LocationCode: fixture.LocationCode,
      LocationName: `${prefix} Pick Face`,
      LocationType: 'PICK_FACE',
      LocationProfileId: fixture.LocationProfileId,
      LocationStatus: LocationStatus.Active,
      CapacityQty: 100,
      CapacityVolume: null,
      CapacityWeight: null,
      PalletSlot: null,
      BondedFlag: false,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(UomOrmEntity), {
      Id: fixture.UomId,
      UomCode: fixture.UomCode,
      UomName: `${prefix} Each`,
      UomType: 'Quantity',
      DecimalPrecision: 0,
      Status: MasterDataStatus.Active,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(SkuOrmEntity), {
      Id: fixture.SkuId,
      SkuCode: fixture.SkuCode,
      SkuName: `${prefix} SKU`,
      DefaultOwnerId: fixture.OwnerId,
      ItemClass: 'GENERAL',
      ItemStatus: MasterDataStatus.Active,
      BaseUomId: fixture.UomId,
      InventoryUomId: fixture.UomId,
      LotControlled: false,
      ExpiryControlled: false,
      SerialControlled: false,
      OwnerControlled: true,
      LpnControlled: false,
      TemperatureControlled: false,
      DgControlled: false,
      CustomsControlled: false,
      QcRequired: false,
      BondedFlag: false,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(WarehouseProfileOrmEntity), {
      Id: fixture.WarehouseProfileId,
      ProfileCode: fixture.WarehouseProfileCode,
      ProfileName: `${prefix} Warehouse Profile`,
      WarehouseTypeCode: warehouseTypeCode,
      Version: 1,
      Status: WarehouseProfileStatus.Active,
      WarehouseId: fixture.WarehouseId,
      OwnerId: fixture.OwnerId,
      ScopeKey: `${fixture.WarehouseId}|${fixture.OwnerId}`,
      EffectiveFrom: now,
      CapabilityFlags: {},
      StrategyPolicy: strategyPolicy,
      ThresholdPolicy: {},
      ApprovalPolicy: {},
      LabelDevicePolicy: {},
      IntegrationPolicy: {},
      AuditPolicy: {},
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(InventoryDimensionOrmEntity), {
      Id: fixture.DimensionId,
      OwnerId: fixture.OwnerId,
      SkuId: fixture.SkuId,
      WarehouseId: fixture.WarehouseId,
      LocationId: fixture.LocationId,
      InventoryStatusId: fixture.InventoryStatusId,
      DimensionKeyHash: `${short.padEnd(64, '0')}`,
      UomId: fixture.UomId,
      LpnCode: null,
      LotNumber: null,
      ExpiryDate: null,
      SerialNumber: null,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await save(dataSource.getRepository(InventoryBalanceOrmEntity), {
      Id: fixture.BalanceId,
      DimensionId: fixture.DimensionId,
      QtyOnHand: quantity,
      QtyReserved: 0,
      QtyAvailable: quantity,
      SourceSystem: 'V1-HB-01',
      ReferenceId: prefix,
      CreatedAt: now,
      UpdatedAt: now,
    });
    await seedCompletedPickTask(dataSource, fixture, now);
    return fixture;
  });
}

async function seedCompletedPickTask(dataSource: DataSource, fixture: RuntimeFixture, now: Date): Promise<void> {
  await save(dataSource.getRepository(OutboundOrderOrmEntity), {
    Id: fixture.OutboundOrderId,
    OrderNumber: `OO-${fixture.Prefix}`,
    SourceSystem: 'V1-HB-01',
    SourceReference: `${fixture.Prefix}-OUT`,
    BusinessReference: `${fixture.Prefix}-OUT`,
    CustomerId: null,
    CustomerSourceSystem: null,
    CustomerExternalReference: `${fixture.Prefix}-CUSTOMER`,
    CustomerCode: null,
    ShipToReference: `${fixture.Prefix}-SHIP-TO`,
    OwnerId: fixture.OwnerId,
    OwnerCode: fixture.OwnerCode,
    WarehouseId: fixture.WarehouseId,
    WarehouseCode: fixture.WarehouseCode,
    Priority: 1,
    CutoffAt: null,
    DocumentStatus: OutboundOrderStatus.Validated,
    ValidationErrors: [],
    CoreFlowInstanceId: null,
    OutboxMessageId: null,
    ImportIdempotencyKey: `${fixture.Prefix}-outbound-import`,
    ImportPayloadFingerprint: `${fixture.Prefix}-outbound-import-fingerprint`,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [],
    ActionIdempotency: {},
    CreatedAt: now,
    UpdatedAt: now,
  });
  await save(dataSource.getRepository(OutboundOrderLineOrmEntity), {
    Id: fixture.OutboundOrderLineId,
    OutboundOrderId: fixture.OutboundOrderId,
    LineNumber: 1,
    SkuId: fixture.SkuId,
    SkuCode: fixture.SkuCode,
    UomId: fixture.UomId,
    UomCode: fixture.UomCode,
    OrderedQuantity: fixture.Quantity,
    ExternalLineReference: `${fixture.Prefix}-LINE-1`,
    ValidationErrors: [],
    CreatedAt: now,
  });
  await save(dataSource.getRepository(AllocationOrmEntity), {
    Id: fixture.AllocationId,
    AllocationNumber: `AL-${fixture.Prefix}`,
    OutboundOrderId: fixture.OutboundOrderId,
    WarehouseId: fixture.WarehouseId,
    WarehouseCode: fixture.WarehouseCode,
    OwnerId: fixture.OwnerId,
    OwnerCode: fixture.OwnerCode,
    Policy: AllocationPolicy.FullOnly,
    Status: AllocationStatus.Allocated,
    TotalOrderedQuantity: fixture.Quantity,
    TotalAllocatedQuantity: fixture.Quantity,
    TotalBackorderedQuantity: 0,
    ShortageReason: null,
    OutboxMessageId: null,
    IdempotencyKey: `${fixture.Prefix}-allocation`,
    PayloadFingerprint: `${fixture.Prefix}-allocation-fingerprint`,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [],
    CreatedAt: now,
    UpdatedAt: now,
  });
  await save(dataSource.getRepository(AllocationLineOrmEntity), {
    Id: fixture.AllocationLineId,
    AllocationId: fixture.AllocationId,
    OutboundOrderLineId: fixture.OutboundOrderLineId,
    LineNumber: 1,
    SkuId: fixture.SkuId,
    SkuCode: fixture.SkuCode,
    UomId: fixture.UomId,
    UomCode: fixture.UomCode,
    OrderedQuantity: fixture.Quantity,
    AllocatedQuantity: fixture.Quantity,
    BackorderedQuantity: 0,
    SourceBalanceId: fixture.BalanceId,
    SourceDimensionId: fixture.DimensionId,
    SourceLocationId: fixture.LocationId,
    InventoryStatusCode: fixture.InventoryStatusCode,
    LotNumber: null,
    SerialNumber: null,
    ExpiryDate: null,
    Status: AllocationStatus.Allocated,
    ShortageReason: null,
    CreatedAt: now,
  });
  await save(dataSource.getRepository(PickReleaseOrmEntity), {
    Id: fixture.PickReleaseId,
    ReleaseNumber: `PR-${fixture.Prefix}`,
    OutboundOrderId: fixture.OutboundOrderId,
    AllocationId: fixture.AllocationId,
    WarehouseId: fixture.WarehouseId,
    WarehouseCode: fixture.WarehouseCode,
    OwnerId: fixture.OwnerId,
    OwnerCode: fixture.OwnerCode,
    ReleaseMode: PickReleaseMode.Discrete,
    BatchSize: 50,
    Status: PickReleaseStatus.Released,
    BlockReason: null,
    TotalTaskCount: 1,
    TotalReleasedQuantity: fixture.Quantity,
    OutboxMessageId: null,
    IdempotencyKey: `${fixture.Prefix}-pick-release`,
    PayloadFingerprint: `${fixture.Prefix}-pick-release-fingerprint`,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [],
    CreatedAt: now,
    UpdatedAt: now,
  });
  await save(dataSource.getRepository(PickTaskOrmEntity), {
    Id: fixture.PickTaskId,
    PickReleaseId: fixture.PickReleaseId,
    OutboundOrderId: fixture.OutboundOrderId,
    AllocationId: fixture.AllocationId,
    AllocationLineId: fixture.AllocationLineId,
    OutboundOrderLineId: fixture.OutboundOrderLineId,
    TaskNumber: `PT-${fixture.Prefix}`,
    Status: PickTaskStatus.Completed,
    Sequence: 1,
    BatchNumber: null,
    SourceBalanceId: fixture.BalanceId,
    SourceDimensionId: fixture.DimensionId,
    SourceLocationId: fixture.LocationId,
    TargetLocationId: null,
    TargetReference: `${fixture.Prefix}-PACK`,
    SkuId: fixture.SkuId,
    SkuCode: fixture.SkuCode,
    UomId: fixture.UomId,
    UomCode: fixture.UomCode,
    Quantity: fixture.Quantity,
    InventoryStatusCode: fixture.InventoryStatusCode,
    LotNumber: null,
    SerialNumber: null,
    ExpiryDate: null,
    CompletedAt: now,
    CompletedBy: 'V1-HB-01-FIXTURE',
    ConfirmIdempotencyKey: `${fixture.Prefix}-pick-confirm`,
    ConfirmPayloadFingerprint: `${fixture.Prefix}-pick-confirm-fingerprint`,
    ConfirmOutboxMessageId: null,
    ConfirmInventoryTransactionId: null,
    ConfirmResultJson: null,
    ExceptionType: null,
    ExceptionCaseId: null,
    ReplenishmentRequired: false,
    ReplenishmentTaskId: null,
    CreatedAt: now,
  });
  await save(dataSource.getRepository(MobileTaskOrmEntity), {
    Id: fixture.MobileTaskId,
    TaskCode: `MT-${fixture.Prefix}`,
    TaskType: MobileTaskType.Pick,
    TaskStatus: MobileTaskStatus.Completed,
    WarehouseId: fixture.WarehouseId,
    WarehouseCode: fixture.WarehouseCode,
    OwnerId: fixture.OwnerId,
    OwnerCode: fixture.OwnerCode,
    SourceDocumentType: 'PickTask',
    SourceDocumentId: fixture.PickTaskId,
    SourceDocumentCode: `PT-${fixture.Prefix}`,
    Priority: 50,
    AssignedUserId: null,
    ClaimedAt: now,
    ReleasedAt: now,
    DueAt: null,
    DeviceCode: 'V1-HB-01',
    SessionId: null,
    TaskPayload: { PickTaskId: fixture.PickTaskId },
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: 'V1-HB-01-FIXTURE',
    UpdatedBy: 'V1-HB-01-FIXTURE',
  });
}

function integrationEnvelope(
  fixture: RuntimeFixture,
  input: {
    MessageId: string;
    MessageType: string;
    BusinessReference: string;
    OwnerContext?: string;
    Payload: Record<string, unknown>;
  },
) {
  return {
    MessageId: input.MessageId,
    MessageType: input.MessageType,
    Version: '1.0',
    BusinessReference: input.BusinessReference,
    SourceSystem: 'V1-HB-01',
    TargetSystem: 'LTA-WMS',
    WarehouseContext: fixture.WarehouseCode,
    OwnerContext: input.OwnerContext ?? fixture.OwnerCode,
    EventTime: new Date().toISOString(),
    CorrelationId: `${fixture.Prefix}-corr`,
    CausationId: `${fixture.Prefix}-cause`,
    Payload: input.Payload,
  };
}

async function expectAuditEvidence(dataSource: DataSource, fixture: RuntimeFixture, objectTypes: string[]) {
  for (const objectType of objectTypes) {
    if (objectType === 'IntegrationMessage') {
      const result = await dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM audit_logs
          WHERE object_type = $1
            AND (
              object_code LIKE $2
              OR reference_id LIKE $2
              OR after_json::text LIKE $2
              OR evidence_refs::text LIKE $2
            )
        `,
        [objectType, `%${fixture.Prefix}%`],
      );
      expect(Number(result[0]?.count ?? 0)).toBeGreaterThan(0);
      continue;
    }
    const count = await dataSource.getRepository(AuditLogOrmEntity).count({
      where: { ObjectType: objectType, WarehouseId: fixture.WarehouseId, OwnerId: fixture.OwnerId },
    });
    expect(count).toBeGreaterThan(0);
  }
}

async function expectForbiddenInventoryStatusesAbsent(dataSource: DataSource): Promise<void> {
  const statuses = await dataSource.getRepository(InventoryStatusOrmEntity).find();
  const codes = statuses.map((status) => status.StatusCode);
  for (const forbidden of FORBIDDEN_INVENTORY_STATUS_TERMS) {
    expect(codes).not.toContain(forbidden);
  }
}

async function cleanupCreatedFixtureOnError<T>(
  dataSource: DataSource,
  prefix: string,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    try {
      await cleanupRuntimeFixture(dataSource, prefix);
    } catch (cleanupError) {
      throw new Error(
        `Fixture ${prefix} setup failed (${error instanceof Error ? error.message : String(error)}) and cleanup also failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
      );
    }
    throw error;
  }
}

async function cleanupRuntimeFixture(dataSource: DataSource, prefix: string): Promise<void> {
  const like = `${prefix}%`;
  await dataSource.query(
    `DELETE FROM integration_reconciliation_items WHERE run_id IN (SELECT id FROM integration_reconciliation_runs WHERE business_reference LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM integration_reconciliation_runs WHERE business_reference LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM shipping_package_staging
     WHERE stage_idempotency_key LIKE $1
        OR package_id IN (SELECT id FROM outbound_packages WHERE idempotency_key LIKE $1)`,
    [like],
  );
  await dataSource.query(
    `DELETE FROM outbound_package_contents
     WHERE package_id IN (SELECT id FROM outbound_packages WHERE idempotency_key LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM outbound_packages WHERE idempotency_key LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM outbound_pack_sessions WHERE idempotency_key LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM inventory_movements
     WHERE from_dimension_id IN (SELECT id FROM inventory_dimensions WHERE reference_id LIKE $1)
        OR to_dimension_id IN (SELECT id FROM inventory_dimensions WHERE reference_id LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM inventory_transactions WHERE idempotency_key LIKE $1`, [`%${prefix}%`]);
  await dataSource.query(`DELETE FROM mobile_tasks WHERE task_code LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM outbound_pick_tasks WHERE task_number LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM outbound_pick_releases WHERE release_number LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM outbound_allocation_lines WHERE allocation_id IN (SELECT id FROM outbound_allocations WHERE allocation_number LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM outbound_allocations WHERE allocation_number LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM outbound_order_lines WHERE outbound_order_id IN (SELECT id FROM outbound_orders WHERE order_number LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM outbound_orders WHERE order_number LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM integration_outbox_messages WHERE business_reference LIKE $1 OR message_id LIKE $1`,
    [like],
  );
  await dataSource.query(
    `DELETE FROM integration_interface_messages WHERE business_reference LIKE $1 OR message_id LIKE $1`,
    [like],
  );
  await dataSource.query(`DELETE FROM integration_import_batches WHERE batch_reference LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM inventory_balances WHERE dimension_id IN (SELECT id FROM inventory_dimensions WHERE reference_id LIKE $1)`,
    [like],
  );
  await dataSource.query(`DELETE FROM inventory_dimensions WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM warehouse_profiles WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM skus WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM uoms WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM locations WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM location_profiles WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM zones WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM warehouses WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM owners WHERE reference_id LIKE $1`, [like]);
  await dataSource.query(`DELETE FROM sites WHERE reference_id LIKE $1`, [like]);
}

async function save<T extends object>(repo: Repository<T>, value: Partial<T>): Promise<void> {
  await repo.save(value as T);
}
