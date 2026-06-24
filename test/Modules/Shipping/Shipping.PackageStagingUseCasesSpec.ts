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
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';
import { StagePackageUseCase } from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import { IShippingStagingRepository } from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { ShippingStagingController } from '@modules/Shipping/Presentation/Controllers/ShippingStagingController';

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

  async List(
    skip = 0,
    take = this.items.length,
  ): Promise<{ Items: ShipmentPackageStagingEntity[]; TotalItems: number }> {
    return { Items: this.items.slice(skip, skip + take), TotalItems: this.items.length };
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

function makeHarness(input: { permissionChecker?: IPermissionChecker; pack?: PackageEntity } = {}) {
  const stagings = new MemoryShippingStagingRepository();
  const packing = new MemoryPackingRepository();
  packing.packageAggregate = { Package: input.pack ?? makePackage(), Contents: [] };
  const coreFlows = new MemoryCoreFlowRepository();
  const audited = new MemoryAuditedTransaction();
  const service = new ShippingStagingLifecycleService(
    stagings,
    packing,
    coreFlows,
    reasonCatalog,
    audited as never,
    input.permissionChecker ?? allowPermissionChecker,
  );
  return { service, stagings, packing, coreFlows, audited };
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

  it('records dock and truck milestones without opening loading scan', async () => {
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
});
