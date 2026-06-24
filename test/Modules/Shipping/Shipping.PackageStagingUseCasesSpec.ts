import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { EntityManager } from 'typeorm';
import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';
import {
  ConfirmShipmentUseCase,
  EvaluateGoodsIssueTriggerUseCase,
  RecordGateOutUseCase,
  ScanLoadingUseCase,
  StagePackageUseCase,
} from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import { IShippingStagingRepository } from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { GoodsIssueTriggerStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueTriggerStatus';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { ShippingStagingController } from '@modules/Shipping/Presentation/Controllers/ShippingStagingController';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

const now = new Date('2026-06-24T00:00:00.000Z');
const context: AuditContext = {
  ActorUserId: 'shipper-1',
  ActorRoleCodes: ['SHIPPER'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-v1-24',
  RequestId: 'req-v1-24',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

function makePackage(overrides: Partial<PackageEntity> = {}): PackageEntity {
  return new PackageEntity({
    Id: 'package-1',
    PackageCode: 'PKG-001',
    PackSessionId: 'pack-session-1',
    PickTaskId: 'pick-task-1',
    OutboundOrderId: 'outbound-order-1',
    WarehouseProfileId: 'profile-1',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    Status: PackageStatus.ReadyForStaging,
    CheckRequired: true,
    CheckResult: PackageCheckResult.Passed,
    CartonType: 'CTN-S',
    Weight: 5,
    Length: 30,
    Width: 20,
    Height: 15,
    IdempotencyKey: 'package-create-1',
    PayloadFingerprint: 'package-fingerprint',
    ClosedAt: now,
    ClosedBy: 'packer-1',
    ReadyForStagingAt: now,
    ReadyForStagingBy: 'packer-1',
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: 'packer-1',
    UpdatedBy: 'packer-1',
    ...overrides,
  });
}

class MemoryPackingRepository implements IPackingRepository {
  public packageAggregate: PackageAggregate | null = {
    Package: makePackage(),
    Contents: [],
  };

  async CreateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    return session;
  }

  async UpdateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    return session;
  }

  async FindSessionById(): Promise<PackSessionEntity | null> {
    return null;
  }

  async FindSessionByIdForUpdate(): Promise<PackSessionEntity | null> {
    return null;
  }

  async FindSessionByIdempotencyKey(): Promise<PackSessionEntity | null> {
    return null;
  }

  async CreatePackage(pack: PackageEntity, contents: PackageContentEntity[]): Promise<PackageAggregate> {
    this.packageAggregate = { Package: pack, Contents: contents };
    return this.packageAggregate;
  }

  async UpdatePackage(pack: PackageEntity, contents?: PackageContentEntity[]): Promise<PackageAggregate> {
    this.packageAggregate = { Package: pack, Contents: contents ?? [] };
    return this.packageAggregate;
  }

  async FindPackageById(id: string): Promise<PackageAggregate | null> {
    return this.packageAggregate?.Package.Id === id ? this.packageAggregate : null;
  }

  async FindPackageByIdForUpdate(id: string): Promise<PackageAggregate | null> {
    return this.FindPackageById(id);
  }

  async FindPackageByIdempotencyKey(): Promise<PackageAggregate | null> {
    return null;
  }

  async ListPackages(): Promise<{ Items: PackageAggregate[]; TotalItems: number }> {
    return this.packageAggregate ? { Items: [this.packageAggregate], TotalItems: 1 } : { Items: [], TotalItems: 0 };
  }
}

class MemoryShippingStagingRepository implements IShippingStagingRepository {
  public items: ShipmentPackageStagingEntity[] = [];

  async Create(entity: ShipmentPackageStagingEntity): Promise<ShipmentPackageStagingEntity> {
    this.items.push(entity);
    return entity;
  }

  async Update(entity: ShipmentPackageStagingEntity): Promise<ShipmentPackageStagingEntity> {
    this.items = this.items.map((item) => (item.Id === entity.Id ? entity : item));
    return entity;
  }

  async FindById(id: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.FindById(id);
  }

  async FindByPackageId(packageId: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.PackageId === packageId) ?? null;
  }

  async FindByStageIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.StageIdempotencyKey === key) ?? null;
  }

  async FindByLoadingIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.LoadingIdempotencyKey === key) ?? null;
  }

  async FindByShipmentConfirmIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.ShipmentConfirmIdempotencyKey === key) ?? null;
  }

  async FindByGateOutIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.GateOutIdempotencyKey === key) ?? null;
  }

  async FindByGoodsIssueTriggerIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.GoodsIssueTriggerIdempotencyKey === key) ?? null;
  }

  async ListByShipmentReference(
    shipmentReference: string,
    scope: {
      WarehouseId?: string | null;
      OwnerId?: string | null;
      OutboundOrderId?: string | null;
    } = {},
  ): Promise<ShipmentPackageStagingEntity[]> {
    return this.items.filter(
      (item) =>
        item.ShipmentReference === shipmentReference &&
        (!scope.WarehouseId || item.WarehouseId === scope.WarehouseId) &&
        (!scope.OwnerId || item.OwnerId === scope.OwnerId) &&
        (!scope.OutboundOrderId || item.OutboundOrderId === scope.OutboundOrderId),
    );
  }

  async List(
    skip = 0,
    take = this.items.length,
  ): Promise<{ Items: ShipmentPackageStagingEntity[]; TotalItems: number }> {
    return { Items: this.items.slice(skip, skip + take), TotalItems: this.items.length };
  }
}

class MemoryWarehouseProfileRepository implements IWarehouseProfileRepository {
  public profile: WarehouseProfileEntity | null;

  constructor(strategyPolicy: Record<string, unknown> = {}) {
    this.profile = new WarehouseProfileEntity({
      Id: 'profile-1',
      ProfileCode: 'WT-01',
      ProfileName: 'WT-01 Profile',
      WarehouseTypeCode: 'WT-01',
      Version: 1,
      Status: WarehouseProfileStatus.Active,
      ScopeKey: 'WT-01',
      EffectiveFrom: now,
      StrategyPolicy: strategyPolicy,
      CreatedAt: now,
      UpdatedAt: now,
    });
  }

  async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    return this.profile?.Id === id ? this.profile : null;
  }

  async FindByCode(profileCode: string): Promise<WarehouseProfileEntity | null> {
    return this.profile?.ProfileCode === profileCode ? this.profile : null;
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
    return this.profile ? { Items: [this.profile], TotalItems: 1 } : { Items: [], TotalItems: 0 };
  }

  async ListActiveByScope(): Promise<WarehouseProfileEntity[]> {
    return this.profile ? [this.profile] : [];
  }

  async FindActiveOverlapping(): Promise<WarehouseProfileEntity[]> {
    return [];
  }

  async RunInTransaction<T>(work: (txRepository: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>) {
    return work(this, {} as EntityManager);
  }
}

class MemoryCoreFlowRepository implements ICoreFlowRepository {
  public instance = new CoreFlowInstanceEntity({
    Id: 'core-flow-1',
    BusinessReference: 'outbound-order-1',
    SourceSystem: 'WMS',
    WarehouseCode: 'WH-1',
    OwnerCode: 'OWN-1',
    CorrelationId: 'corr-v1-24',
    CurrentStage: CoreFlowStageCode.Shipping,
    Status: CoreFlowInstanceStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });
  public milestones: WorkflowMilestoneEntity[] = [];

  async CreateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.instance = instance;
    return instance;
  }

  async UpdateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.instance = instance;
    return instance;
  }

  async FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instance.Id === id ? this.instance : null;
  }

  async FindInstanceByBusinessReference(reference: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instance.BusinessReference === reference ? this.instance : null;
  }

  async CreateMilestone(milestone: WorkflowMilestoneEntity): Promise<WorkflowMilestoneEntity> {
    this.milestones.push(milestone);
    return milestone;
  }

  async ListMilestones(): Promise<WorkflowMilestoneEntity[]> {
    return this.milestones;
  }

  async CreateHandoff(handoff: WorkflowHandoffEntity): Promise<WorkflowHandoffEntity> {
    return handoff;
  }
}

class MemoryIntegrationRepository implements IIntegrationRepository {
  public Outbox: OutboxMessageEntity[] = [];

  async FindInterfaceMessageByMessageId(): Promise<InterfaceMessageEntity | null> {
    return null;
  }

  async FindOutboxMessageByMessageId(messageId: string): Promise<OutboxMessageEntity | null> {
    return this.Outbox.find((item) => item.MessageId === messageId) ?? null;
  }

  async CreateImport(
    importBatch: ImportBatchEntity,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
  ): Promise<{
    ImportBatch: ImportBatchEntity;
    InterfaceMessages: InterfaceMessageEntity[];
    OutboxMessages: OutboxMessageEntity[];
  }> {
    this.Outbox.push(...outboxMessages);
    return { ImportBatch: importBatch, InterfaceMessages: interfaceMessages, OutboxMessages: outboxMessages };
  }

  async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.Outbox.push(outboxMessage);
    return outboxMessage;
  }

  async ListImportBatches(): Promise<{ Items: ImportBatchEntity[]; TotalItems: number }> {
    return { Items: [], TotalItems: 0 };
  }

  async ListOutboxMessages(): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    return { Items: this.Outbox, TotalItems: this.Outbox.length };
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

function makeHarness(
  input: {
    permissionChecker?: IPermissionChecker;
    pack?: PackageEntity;
    strategyPolicy?: Record<string, unknown>;
  } = {},
) {
  const stagings = new MemoryShippingStagingRepository();
  const packing = new MemoryPackingRepository();
  packing.packageAggregate = { Package: input.pack ?? makePackage(), Contents: [] };
  const coreFlows = new MemoryCoreFlowRepository();
  const integrations = new MemoryIntegrationRepository();
  const audited = new MemoryAuditedTransaction();
  const warehouseProfiles = new MemoryWarehouseProfileRepository(input.strategyPolicy);
  const service = new ShippingStagingLifecycleService(
    stagings,
    packing,
    coreFlows,
    integrations,
    reasonCatalog,
    audited as never,
    input.permissionChecker ?? allowPermissionChecker,
    warehouseProfiles,
  );
  return { service, stagings, packing, coreFlows, integrations, audited, warehouseProfiles };
}

function makeStaging(
  overrides: Partial<ConstructorParameters<typeof ShipmentPackageStagingEntity>[0]> = {},
): ShipmentPackageStagingEntity {
  return new ShipmentPackageStagingEntity({
    Id: 'staging-1',
    StagingCode: 'STG-001',
    PackageId: 'package-1',
    PackageCode: 'PKG-001',
    OutboundOrderId: 'outbound-order-1',
    WarehouseProfileId: 'profile-1',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    Status: ShipmentPackageStagingStatus.Staged,
    InventoryStatusCode: 'STAGED',
    ShipmentReference: 'SHIP-001',
    StagingLaneCode: 'STAGE-A',
    CoreFlowInstanceId: 'core-flow-1',
    StageIdempotencyKey: 'stage-1',
    StagePayloadFingerprint: 'stage-fingerprint',
    ReasonCode: 'RC-V1-DISCREPANCY',
    ReasonCodeId: 'reason-RC-V1-DISCREPANCY',
    EvidenceRefs: ['scan:stage'],
    StagedAt: now,
    StagedBy: 'shipper-1',
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: 'shipper-1',
    UpdatedBy: 'shipper-1',
    ...overrides,
  });
}

async function stagePackage(harness = makeHarness()) {
  return harness.service.StagePackage(
    {
      PackageId: 'package-1',
      ShipmentReference: 'SHIP-001',
      StagingLaneCode: 'STAGE-A',
      EvidenceRefs: ['scan:stage'],
      IdempotencyKey: 'stage-1',
    },
    context,
  );
}

async function readyForLoading(harness = makeHarness()) {
  const staged = await stagePackage(harness);
  await harness.service.AssignDock(
    staged.Id,
    {
      DockDoorCode: 'DOCK-01',
      EvidenceRefs: ['dock:scan'],
      IdempotencyKey: 'dock-1',
    },
    context,
  );
  return harness.service.AssignTruck(
    staged.Id,
    {
      TruckReference: 'TRUCK-001',
      VehicleNumber: '51C-001',
      EvidenceRefs: ['truck:scan'],
      IdempotencyKey: 'truck-1',
    },
    context,
  );
}

describe('ShippingStagingLifecycleService V1-24', () => {
  it('exposes shipping staging routes with Shipment permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController)).toBe('shipping/staging');
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.List)).toBe('packages');
    expect(Reflect.getMetadata(METHOD_METADATA, ShippingStagingController.prototype.List)).toBe(0);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ShippingStagingController.prototype.List)).toEqual({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Shipment,
      Scope: {
        WarehouseId: { In: 'query', Key: 'WarehouseId' },
        OwnerId: { In: 'query', Key: 'OwnerId' },
      },
    });
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.AssignDock)).toBe(
      'packages/:id/dock',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.ScanLoading)).toBe(
      'packages/:id/loading',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.ConfirmShipment)).toBe(
      'packages/:id/confirm',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.RecordGateOut)).toBe(
      'packages/:id/gate-out',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.EvaluateGoodsIssueTrigger)).toBe(
      'packages/:id/goods-issue-trigger',
    );
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ShippingStagingController.prototype.RecordGateOut)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Shipment,
      Scope: undefined,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ShippingStagingController.prototype.EvaluateGoodsIssueTrigger),
    ).toEqual({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.GoodsIssue,
      Scope: undefined,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ShippingStagingController.prototype.Stage)).toEqual({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Shipment,
      Scope: undefined,
    });
  });

  it('stages only ReadyForStaging packages and records audit plus CoreFlow milestone', async () => {
    const harness = makeHarness();

    const staged = await stagePackage(harness);

    expect(staged).toMatchObject({
      PackageId: 'package-1',
      PackageCode: 'PKG-001',
      Status: ShipmentPackageStagingStatus.Staged,
      InventoryStatusCode: 'STAGED',
      StagingLaneCode: 'STAGE-A',
    });
    expect(harness.stagings.items).toHaveLength(1);
    expect(harness.coreFlows.milestones[0]).toMatchObject({
      StepCode: CoreFlowStepCode.PackageStaged,
      InventoryStatusCode: 'STAGED',
    });
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ObjectType: ObjectType.Shipment,
          Action: ActionCode.Create,
          Result: AuditResult.Success,
        }),
      ]),
    );
  });

  it('blocks package staging before ReadyForStaging and writes failed audit', async () => {
    const harness = makeHarness({ pack: makePackage({ Status: PackageStatus.Packed }) });

    await expect(stagePackage(harness)).rejects.toBeInstanceOf(BusinessRuleException);
    expect(harness.stagings.items).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ObjectType: ObjectType.Shipment,
          Result: AuditResult.Failed,
          ReferenceType: 'PackageStagingGate',
        }),
      ]),
    );
  });

  it('writes failed audit when package is missing', async () => {
    const harness = makeHarness();
    harness.packing.packageAggregate = null;

    await expect(stagePackage(harness)).rejects.toThrow('Package not found');
    expect(harness.stagings.items).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ObjectType: ObjectType.Shipment,
          ObjectId: 'package-1',
          Result: AuditResult.Failed,
          ReferenceType: 'PackageStagingGate',
        }),
      ]),
    );
  });

  it('blocks staging location outside the requested lane and writes failed audit', async () => {
    const harness = makeHarness();

    await expect(
      harness.service.StagePackage(
        {
          PackageId: 'package-1',
          ShipmentReference: 'SHIP-001',
          StagingLaneCode: 'STAGE-A',
          StagingLocationCode: 'STAGE-B-01',
          EvidenceRefs: ['scan:stage'],
          IdempotencyKey: 'stage-1',
        },
        context,
      ),
    ).rejects.toThrow('Staging location must belong to staging lane');
    expect(harness.stagings.items).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ReferenceType: 'PackageStagingGate',
        }),
      ]),
    );
  });

  it('keeps CoreFlow unresolved as non-blocking audit metadata', async () => {
    const harness = makeHarness();
    harness.coreFlows.instance = new CoreFlowInstanceEntity({
      Id: 'core-flow-other',
      BusinessReference: 'other-outbound',
      SourceSystem: 'WMS',
      WarehouseCode: 'WH-1',
      OwnerCode: 'OWN-1',
      CorrelationId: 'corr-v1-24',
      CurrentStage: CoreFlowStageCode.Shipping,
      Status: CoreFlowInstanceStatus.Active,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const staged = await stagePackage(harness);

    expect(staged.CoreFlowInstanceId).toBeNull();
    expect(harness.coreFlows.milestones).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Success,
          AfterJson: expect.objectContaining({
            CoreFlowMilestone: { Status: 'UnresolvedNonBlocking' },
          }),
        }),
      ]),
    );
  });

  it('records dock and truck milestones before loading scan', async () => {
    const harness = makeHarness();
    const staged = await stagePackage(harness);

    const docked = await harness.service.AssignDock(
      staged.Id,
      {
        DockDoorCode: 'DOCK-01',
        EvidenceRefs: ['dock:scan'],
        IdempotencyKey: 'dock-1',
      },
      context,
    );
    const trucked = await harness.service.AssignTruck(
      staged.Id,
      {
        TruckReference: 'TRUCK-001',
        VehicleNumber: '51C-001',
        DriverName: 'Driver A',
        EvidenceRefs: ['truck:scan'],
        IdempotencyKey: 'truck-1',
      },
      context,
    );

    expect(docked.Status).toBe(ShipmentPackageStagingStatus.DockAssigned);
    expect(trucked.Status).toBe(ShipmentPackageStagingStatus.ReadyForLoading);
    expect(harness.coreFlows.milestones.map((item) => item.StepCode)).toEqual([
      CoreFlowStepCode.PackageStaged,
      CoreFlowStepCode.DockTruckMilestoneRecorded,
      CoreFlowStepCode.DockTruckMilestoneRecorded,
    ]);
    expect(JSON.stringify(trucked)).not.toMatch(/SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED/);
  });

  it('scans loading for a ReadyForLoading package and records audit plus CoreFlow milestone', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);

    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        LoadReference: 'LOAD-001',
        TruckReference: 'TRUCK-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );

    expect(loaded).toMatchObject({
      Status: ShipmentPackageStagingStatus.Loaded,
      InventoryStatusCode: 'LOADED',
      LoadReference: 'LOAD-001',
      LoadedBy: 'shipper-1',
      GoodsIssueTrigger: 'at_loading',
      GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Ready,
      LoadingOutboxMessageId: expect.any(String),
      GoodsIssueTriggerOutboxMessageId: expect.any(String),
    });
    expect(harness.integrations.Outbox).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          EventType: 'PackageLoaded',
          BusinessReference: 'SHIP-001',
          Payload: expect.objectContaining({ EventName: 'PackageLoaded', PackageCode: 'PKG-001' }),
        }),
        expect.objectContaining({
          EventType: 'GoodsIssueTriggerReady',
          BusinessReference: 'SHIP-001',
          Payload: expect.objectContaining({
            EventName: 'GoodsIssueTriggerReady',
            GoodsIssueTrigger: 'at_loading',
            GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Ready,
          }),
        }),
      ]),
    );
    expect(harness.coreFlows.milestones.map((item) => item.StepCode)).toContain(CoreFlowStepCode.LoadingConfirmed);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ObjectType: ObjectType.Shipment,
          Action: ActionCode.Update,
          Result: AuditResult.Success,
          ReferenceType: 'ShippingMilestone',
        }),
      ]),
    );
    expect(JSON.stringify(loaded)).not.toMatch(/SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED/);
  });

  it('waits for gate-out before Goods Issue trigger when WarehouseProfile config is at_gate_out', async () => {
    const harness = makeHarness({ strategyPolicy: { goodsIssueTrigger: 'at_gate_out' } });
    const ready = await readyForLoading(harness);
    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );

    expect(loaded).toMatchObject({
      Status: ShipmentPackageStagingStatus.Loaded,
      InventoryStatusCode: 'LOADED',
      GoodsIssueTrigger: 'at_gate_out',
      GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Pending,
      GoodsIssueTriggerOutboxMessageId: null,
    });
    expect(harness.integrations.Outbox.map((item) => item.EventType)).not.toContain('GoodsIssueTriggerReady');

    const confirmed = await harness.service.ConfirmShipment(
      loaded.Id,
      {
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['confirm:shipment'],
        IdempotencyKey: 'confirm-1',
      },
      context,
    );
    const gated = await harness.service.RecordGateOut(
      confirmed.Id,
      {
        GateOutReference: 'GATE-OUT-001',
        TruckReference: 'TRUCK-001',
        VehicleNumber: '51C-001',
        EvidenceRefs: ['gate:out'],
        IdempotencyKey: 'gate-out-1',
      },
      context,
    );

    expect(gated).toMatchObject({
      Status: ShipmentPackageStagingStatus.GateOutRecorded,
      GateOutReference: 'GATE-OUT-001',
      GateOutBy: 'shipper-1',
      GoodsIssueTrigger: 'at_gate_out',
      GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Ready,
      GateOutOutboxMessageId: expect.any(String),
      GoodsIssueTriggerOutboxMessageId: expect.any(String),
    });
    expect(harness.integrations.Outbox.map((item) => item.EventType)).toEqual(
      expect.arrayContaining(['PackageLoaded', 'ShipmentConfirmed', 'GateOutRecorded', 'GoodsIssueTriggerReady']),
    );
    expect(harness.coreFlows.milestones.map((item) => item.StepCode)).toContain(CoreFlowStepCode.GateOutRecorded);
    expect(JSON.stringify(gated)).not.toMatch(/SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED/);
  });

  it('rejects shipment milestone codes when callers try to use them as InventoryStatus', async () => {
    const harness = makeHarness({ strategyPolicy: { goodsIssueTrigger: 'at_gate_out' } });
    const ready = await readyForLoading(harness);
    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );
    const confirmed = await harness.service.ConfirmShipment(
      loaded.Id,
      {
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['confirm:shipment'],
        IdempotencyKey: 'confirm-1',
      },
      context,
    );

    await expect(
      harness.service.RecordGateOut(
        confirmed.Id,
        {
          InventoryStatusCode: 'GOODS_ISSUE_POSTED',
          EvidenceRefs: ['gate:out'],
          IdempotencyKey: 'gate-out-1',
        },
        context,
      ),
    ).rejects.toThrow('Shipment/goods issue milestones must not be used as InventoryStatus');
    await expect(
      harness.service.EvaluateGoodsIssueTrigger(
        confirmed.Id,
        {
          InventoryStatusCode: 'GATE_OUT',
          EvidenceRefs: ['gi:trigger'],
          IdempotencyKey: 'gi-trigger-1',
        },
        context,
      ),
    ).rejects.toThrow('Shipment/goods issue milestones must not be used as InventoryStatus');
  });

  it('rejects wrong package during loading scan and writes failed audit', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);

    await expect(
      harness.service.ScanLoading(
        ready.Id,
        {
          ScannedPackageCode: 'PKG-OTHER',
          ShipmentReference: 'SHIP-001',
          EvidenceRefs: ['loading:scan'],
          IdempotencyKey: 'loading-1',
        },
        context,
      ),
    ).rejects.toThrow('Scanned package does not match staging package');
    expect(harness.stagings.items[0].Status).toBe(ShipmentPackageStagingStatus.ReadyForLoading);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ReferenceType: 'LoadingScanGate',
        }),
      ]),
    );
  });

  it('rejects shipment or truck mismatch during loading scan', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);

    await expect(
      harness.service.ScanLoading(
        ready.Id,
        {
          ScannedPackageCode: 'PKG-001',
          ShipmentReference: 'SHIP-OTHER',
          EvidenceRefs: ['loading:scan'],
          IdempotencyKey: 'loading-ship-mismatch',
        },
        context,
      ),
    ).rejects.toThrow('Scanned shipment does not match staging shipment');
    await expect(
      harness.service.ScanLoading(
        ready.Id,
        {
          ScannedPackageCode: 'PKG-001',
          TruckReference: 'TRUCK-OTHER',
          EvidenceRefs: ['loading:scan'],
          IdempotencyKey: 'loading-truck-mismatch',
        },
        context,
      ),
    ).rejects.toThrow('Scanned truck does not match assigned truck');
  });

  it('blocks shipment confirmation until the package is loaded', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);

    await expect(
      harness.service.ConfirmShipment(
        ready.Id,
        {
          ShipmentReference: 'SHIP-001',
          EvidenceRefs: ['confirm:shipment'],
          IdempotencyKey: 'confirm-1',
        },
        context,
      ),
    ).rejects.toThrow('Package must be loaded before shipment confirmation');
  });

  it('blocks full-load shipment confirmation when another shipment package is missing', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);
    harness.stagings.items.push(
      makeStaging({
        Id: 'staging-2',
        StagingCode: 'STG-002',
        PackageId: 'package-2',
        PackageCode: 'PKG-002',
        DockDoorCode: 'DOCK-01',
        TruckReference: 'TRUCK-001',
        Status: ShipmentPackageStagingStatus.ReadyForLoading,
      }),
    );
    await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );

    await expect(
      harness.service.ConfirmShipment(
        ready.Id,
        {
          ShipmentReference: 'SHIP-001',
          EvidenceRefs: ['confirm:shipment'],
          IdempotencyKey: 'confirm-1',
        },
        context,
      ),
    ).rejects.toThrow('Full-load shipment confirmation is blocked by missing packages');
  });

  it('blocks full-load shipment confirmation when the shipment reference is missing', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);
    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );
    const stored = harness.stagings.items.find((item) => item.Id === loaded.Id);
    if (!stored) throw new Error('Expected loaded staging in memory repository');
    stored.ShipmentReference = null;

    await expect(
      harness.service.ConfirmShipment(
        ready.Id,
        {
          EvidenceRefs: ['confirm:shipment'],
          IdempotencyKey: 'confirm-no-shipment-ref',
        },
        context,
      ),
    ).rejects.toThrow('ShipmentReference is required for full-load confirmation');
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ReferenceType: 'LoadingScanGate',
        }),
      ]),
    );
  });

  it('confirms loaded shipment and keeps duplicate idempotency stable', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);
    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );

    const confirmed = await harness.service.ConfirmShipment(
      loaded.Id,
      {
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['confirm:shipment'],
        IdempotencyKey: 'confirm-1',
      },
      context,
    );
    const duplicate = await harness.service.ConfirmShipment(
      loaded.Id,
      {
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['confirm:shipment'],
        IdempotencyKey: 'confirm-1',
      },
      context,
    );

    expect(confirmed.Status).toBe(ShipmentPackageStagingStatus.ShipmentConfirmed);
    expect(confirmed.ShipmentConfirmedBy).toBe('shipper-1');
    expect(confirmed.ShipmentConfirmOutboxMessageId).toEqual(expect.any(String));
    expect(duplicate.Status).toBe(ShipmentPackageStagingStatus.ShipmentConfirmed);
    expect(harness.integrations.Outbox.map((item) => item.EventType)).toEqual(
      expect.arrayContaining(['PackageLoaded', 'GoodsIssueTriggerReady', 'ShipmentConfirmed']),
    );
    expect(JSON.stringify(confirmed)).not.toMatch(/SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED/);
  });

  it('confirms every loaded package in the scoped full-load shipment cohort', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);
    const loaded = await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );
    harness.stagings.items.push(
      makeStaging({
        Id: 'staging-2',
        StagingCode: 'STG-002',
        PackageId: 'package-2',
        PackageCode: 'PKG-002',
        DockDoorCode: 'DOCK-01',
        TruckReference: 'TRUCK-001',
        Status: ShipmentPackageStagingStatus.Loaded,
        InventoryStatusCode: 'LOADED',
        LoadedAt: now,
        LoadedBy: 'shipper-1',
        LoadingIdempotencyKey: 'loading-2',
        LoadingPayloadFingerprint: 'loading-fingerprint-2',
      }),
    );

    await harness.service.ConfirmShipment(
      loaded.Id,
      {
        ShipmentReference: 'SHIP-001',
        EvidenceRefs: ['confirm:shipment'],
        IdempotencyKey: 'confirm-1',
      },
      context,
    );

    expect(harness.stagings.items.find((item) => item.Id === loaded.Id)?.Status).toBe(
      ShipmentPackageStagingStatus.ShipmentConfirmed,
    );
    expect(harness.stagings.items.find((item) => item.Id === 'staging-2')?.Status).toBe(
      ShipmentPackageStagingStatus.ShipmentConfirmed,
    );
  });

  it('detects loading idempotency conflict for changed payloads', async () => {
    const harness = makeHarness();
    const ready = await readyForLoading(harness);
    await harness.service.ScanLoading(
      ready.Id,
      {
        ScannedPackageCode: 'PKG-001',
        EvidenceRefs: ['loading:scan'],
        IdempotencyKey: 'loading-1',
      },
      context,
    );

    await expect(
      harness.service.ScanLoading(
        ready.Id,
        {
          ScannedPackageCode: 'PKG-001',
          LoadReference: 'LOAD-CHANGED',
          EvidenceRefs: ['loading:scan'],
          IdempotencyKey: 'loading-1',
        },
        context,
      ),
    ).rejects.toThrow('Loading idempotency key already used');
  });

  it('does not overwrite dock or truck milestones with a new idempotency key', async () => {
    const harness = makeHarness();
    const staged = await stagePackage(harness);
    await harness.service.AssignDock(
      staged.Id,
      {
        DockDoorCode: 'DOCK-01',
        EvidenceRefs: ['dock:scan'],
        IdempotencyKey: 'dock-1',
      },
      context,
    );
    await expect(
      harness.service.AssignDock(
        staged.Id,
        {
          DockDoorCode: 'DOCK-02',
          EvidenceRefs: ['dock:scan'],
          IdempotencyKey: 'dock-2',
        },
        context,
      ),
    ).rejects.toThrow('Dock milestone already assigned');
  });

  it('detects idempotency conflict for staging payload changes', async () => {
    const harness = makeHarness();
    await stagePackage(harness);

    await expect(
      harness.service.StagePackage(
        {
          PackageId: 'package-1',
          ShipmentReference: 'SHIP-CHANGED',
          StagingLaneCode: 'STAGE-B',
          EvidenceRefs: ['scan:stage'],
          IdempotencyKey: 'stage-1',
        },
        context,
      ),
    ).rejects.toThrow('Package staging idempotency key already used');
  });

  it('denies shipment mutation when Shipment permission rejects actor', async () => {
    const denied: IPermissionChecker = {
      Check: async (): Promise<PermissionDecision> => ({ Allowed: false, Reason: 'PERMISSION_DENIED' }),
    };
    const harness = makeHarness({ permissionChecker: denied });

    await expect(stagePackage(harness)).rejects.toBeInstanceOf(ForbiddenAppException);
    expect(harness.stagings.items).toHaveLength(0);
  });

  it('rejects PageSize greater than 100 instead of silently widening the list', async () => {
    const harness = makeHarness();

    await expect(harness.service.List({ Page: 1, PageSize: 101 }, context.ActorUserId)).rejects.toThrow(
      'PageSize must not be greater than 100',
    );
  });

  it('paginates after permission filtering so allowed records are not hidden behind denied records', async () => {
    const scopedPermissionChecker: IPermissionChecker = {
      Check: async (input): Promise<PermissionDecision> => ({
        Allowed: input.Scope?.WarehouseId === 'warehouse-allowed',
      }),
    };
    const harness = makeHarness({ permissionChecker: scopedPermissionChecker });
    harness.stagings.items = [
      makeStaging({ Id: 'staging-denied', WarehouseId: 'warehouse-denied' }),
      makeStaging({ Id: 'staging-allowed', WarehouseId: 'warehouse-allowed' }),
    ];

    const result = await harness.service.List({ Page: 1, PageSize: 1 }, context.ActorUserId);

    expect(result.Items.map((item) => item.Id)).toEqual(['staging-allowed']);
    expect(result.Meta.TotalItems).toBe(1);
  });
});

describe('Shipping staging use case wrappers', () => {
  it('passes stage package calls through the lifecycle use case', async () => {
    const lifecycle = { StagePackage: jest.fn(async () => ({ ok: true })) };
    const useCase = new StagePackageUseCase(lifecycle as never);

    await expect(
      useCase.Execute({ PackageId: 'package-1', StagingLaneCode: 'STAGE-A', IdempotencyKey: 'stage' }, context),
    ).resolves.toEqual({ ok: true });
    expect(lifecycle.StagePackage).toHaveBeenCalledWith(
      { PackageId: 'package-1', StagingLaneCode: 'STAGE-A', IdempotencyKey: 'stage' },
      context,
    );
  });

  it('passes loading and confirmation calls through the lifecycle use cases', async () => {
    const lifecycle = {
      ScanLoading: jest.fn(async () => ({ loaded: true })),
      ConfirmShipment: jest.fn(async () => ({ confirmed: true })),
    };
    const scanUseCase = new ScanLoadingUseCase(lifecycle as never);
    const confirmUseCase = new ConfirmShipmentUseCase(lifecycle as never);

    await expect(
      scanUseCase.Execute('staging-1', { ScannedPackageCode: 'PKG-001', IdempotencyKey: 'load' }, context),
    ).resolves.toEqual({ loaded: true });
    await expect(confirmUseCase.Execute('staging-1', { IdempotencyKey: 'confirm' }, context)).resolves.toEqual({
      confirmed: true,
    });
    expect(lifecycle.ScanLoading).toHaveBeenCalledWith(
      'staging-1',
      { ScannedPackageCode: 'PKG-001', IdempotencyKey: 'load' },
      context,
    );
    expect(lifecycle.ConfirmShipment).toHaveBeenCalledWith('staging-1', { IdempotencyKey: 'confirm' }, context);
  });

  it('passes gate-out and Goods Issue trigger calls through the lifecycle use cases', async () => {
    const lifecycle = {
      RecordGateOut: jest.fn(async () => ({ gated: true })),
      EvaluateGoodsIssueTrigger: jest.fn(async () => ({ triggered: true })),
    };
    const gateOutUseCase = new RecordGateOutUseCase(lifecycle as never);
    const goodsIssueUseCase = new EvaluateGoodsIssueTriggerUseCase(lifecycle as never);

    await expect(
      gateOutUseCase.Execute('staging-1', { GateOutReference: 'GATE-OUT-001', IdempotencyKey: 'gate' }, context),
    ).resolves.toEqual({ gated: true });
    await expect(
      goodsIssueUseCase.Execute('staging-1', { GoodsIssueTrigger: 'at_gate_out', IdempotencyKey: 'gi' }, context),
    ).resolves.toEqual({ triggered: true });
    expect(lifecycle.RecordGateOut).toHaveBeenCalledWith(
      'staging-1',
      { GateOutReference: 'GATE-OUT-001', IdempotencyKey: 'gate' },
      context,
    );
    expect(lifecycle.EvaluateGoodsIssueTrigger).toHaveBeenCalledWith(
      'staging-1',
      { GoodsIssueTrigger: 'at_gate_out', IdempotencyKey: 'gi' },
      context,
    );
  });
});
