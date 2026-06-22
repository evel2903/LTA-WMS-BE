import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

const now = new Date('2026-06-22T08:00:00.000Z');

class FakeInboundRepository implements IInboundPlanRepository {
  public Plans: InboundPlanEntity[] = [];
  public Lines: InboundPlanLineEntity[] = [];
  public CreateCalls = 0;
  public MissBusinessKeyOnce = false;
  public ThrowConflictOnCreate = false;

  public async Create(
    plan: InboundPlanEntity,
    lines: InboundPlanLineEntity[],
  ): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }> {
    this.CreateCalls += 1;
    if (this.ThrowConflictOnCreate) {
      this.ThrowConflictOnCreate = false;
      throw new ConflictException('Inbound plan already exists');
    }
    this.Plans.push(plan);
    this.Lines.push(...lines);
    return { Plan: plan, Lines: lines };
  }

  public async UpdatePlan(plan: InboundPlanEntity): Promise<InboundPlanEntity> {
    const index = this.Plans.findIndex((item) => item.Id === plan.Id);
    if (index >= 0) this.Plans[index] = plan;
    return plan;
  }

  public async FindById(id: string): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    const plan = this.Plans.find((item) => item.Id === id);
    if (!plan) return null;
    return { Plan: plan, Lines: this.Lines.filter((line) => line.InboundPlanId === id) };
  }

  public async FindByBusinessKey(
    sourceSystem: string,
    sourceDocumentType: string,
    sourceDocumentNumber: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    if (this.MissBusinessKeyOnce) {
      this.MissBusinessKeyOnce = false;
      return null;
    }
    const plan = this.Plans.find(
      (item) =>
        item.SourceSystem === sourceSystem &&
        item.SourceDocumentType === sourceDocumentType &&
        item.SourceDocumentNumber === sourceDocumentNumber &&
        item.OwnerId === ownerId &&
        item.WarehouseId === warehouseId,
    );
    if (!plan) return null;
    return { Plan: plan, Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id) };
  }

  public async List(
    skip: number,
    take: number,
    filter?: Parameters<IInboundPlanRepository['List']>[2],
  ): Promise<{ Items: Array<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }>; TotalItems: number }> {
    const candidates = this.Plans.filter((plan) => this.MatchFilter(plan, filter));
    const page = candidates.slice(skip, skip + take).map((plan) => ({
      Plan: plan,
      Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id),
    }));
    return { Items: page, TotalItems: candidates.length };
  }

  public async FindCandidates(
    filter?: Parameters<IInboundPlanRepository['FindCandidates']>[0],
  ): Promise<Array<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }>> {
    return this.Plans.filter((plan) => this.MatchFilter(plan, filter)).map((plan) => ({
      Plan: plan,
      Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id),
    }));
  }

  private MatchFilter(plan: InboundPlanEntity, filter?: Parameters<IInboundPlanRepository['FindCandidates']>[0]) {
    if (!filter) return true;
    if (filter.SourceSystem && plan.SourceSystem !== filter.SourceSystem) return false;
    if (filter.SourceDocumentNumber && plan.SourceDocumentNumber !== filter.SourceDocumentNumber) return false;
    if (filter.OwnerId && plan.OwnerId !== filter.OwnerId) return false;
    if (filter.WarehouseId && plan.WarehouseId !== filter.WarehouseId) return false;
    if (filter.Status && plan.Status !== filter.Status) return false;
    return true;
  }
}

const supplier = () =>
  new PartnerEntity({
    Id: 'supplier-1',
    PartnerCode: 'SUP-A',
    PartnerName: 'Supplier A',
    PartnerType: PartnerType.Supplier,
    Status: PartnerStatus.Active,
    SourceSystem: 'ERP',
    ExternalReference: 'SUP-A',
    CreatedAt: now,
    UpdatedAt: now,
  });

const owner = () =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWN-A',
    OwnerName: 'Owner A',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const warehouse = () =>
  new WarehouseEntity({
    Id: 'warehouse-1',
    SiteId: 'site-1',
    WarehouseCode: 'WT-01',
    WarehouseName: 'Warehouse WT-01',
    WarehouseTypeCode: 'WT-01',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const uom = () =>
  new UomEntity({
    Id: 'uom-1',
    UomCode: 'EA',
    UomName: 'Each',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const sku = () =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-A',
    SkuName: 'SKU A',
    ItemClass: 'General',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-1',
    InventoryUomId: 'uom-1',
    CreatedAt: now,
    UpdatedAt: now,
  });

const profile = (strategyPolicy: Record<string, unknown> = {}) =>
  new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WT01-PROFILE',
    ProfileName: 'WT01 Profile',
    WarehouseTypeCode: 'WT-01',
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    WarehouseId: 'warehouse-1',
    OwnerId: 'owner-1',
    ScopeKey: 'warehouse-1:owner-1',
    EffectiveFrom: now,
    EffectiveTo: null,
    StrategyPolicy: strategyPolicy,
    CreatedAt: now,
    UpdatedAt: now,
  });

const createRequest = () => ({
  SourceSystem: 'ERP',
  SourceDocumentType: 'ASN',
  SourceDocumentNumber: 'ASN-10001',
  SupplierId: 'supplier-1',
  OwnerId: 'owner-1',
  WarehouseId: 'warehouse-1',
  WarehouseProfileId: 'profile-1',
  ExpectedArrivalAt: now,
  Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12, ExternalLineReference: '10' }],
});

const repoBundle = () => {
  const inbound = new FakeInboundRepository();
  const partners = { FindById: jest.fn(async () => supplier()) };
  const owners = { FindById: jest.fn(async () => owner()) };
  const warehouses = { FindById: jest.fn(async () => warehouse()) };
  const skus = { FindById: jest.fn(async () => sku()) };
  const uoms = { FindById: jest.fn(async () => uom()) };
  const coreFlows = {
    Instances: [] as unknown[],
    Milestones: [] as unknown[],
    CreateInstance: jest.fn(async (instance) => {
      coreFlows.Instances.push(instance);
      return instance;
    }),
    CreateMilestone: jest.fn(async (milestone) => {
      coreFlows.Milestones.push(milestone);
      return milestone;
    }),
    FindInstanceByBusinessReference: jest.fn(async () => null),
    FindInstanceById: jest.fn(async () => ({ Id: 'core-flow-1', BusinessReference: 'ERP:ASN:ASN-10001' })),
  };
  const integrations = {
    Outbox: [] as unknown[],
    FindOutboxMessageByMessageId: jest.fn(async () => null),
    CreateOutboxMessage: jest.fn(async (message) => {
      integrations.Outbox.push(message);
      return message;
    }),
  };
  const profiles = { FindById: jest.fn(async () => profile()) };
  const reasonCatalog = {
    ValidateReason: jest.fn(async () => ({
      ReasonCodeId: 'reason-1',
      EvidenceRequired: false,
      ApprovalRequired: false,
    })),
  };
  const permissionChecker = {
    Check: jest.fn(async () => ({ Allowed: true })),
  };
  const auditEntries: unknown[] = [];
  const audited = {
    Entries: auditEntries,
    Run: jest.fn(async (work: Parameters<AuditedTransaction['Run']>[0]) => {
      const { result, entry } = await work(undefined as never);
      auditEntries.push(entry);
      return result;
    }),
  };
  return {
    inbound,
    partners,
    owners,
    warehouses,
    skus,
    uoms,
    coreFlows,
    integrations,
    profiles,
    reasonCatalog,
    permissionChecker,
    audited,
  };
};

const createUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new CreateInboundPlanUseCase(
    bundle.inbound,
    bundle.partners as unknown as IPartnerRepository,
    bundle.owners as unknown as IOwnerRepository,
    bundle.warehouses as unknown as IWarehouseRepository,
    bundle.skus as unknown as ISkuRepository,
    bundle.uoms as unknown as IUomRepository,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.audited as unknown as AuditedTransaction,
  );

const recordGateInUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new RecordGateInUseCase(
    bundle.inbound,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const readinessUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ValidateReceivingReadinessUseCase(
    bundle.inbound,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

describe('Inbound plan use cases', () => {
  it('creates inbound plan, lines, CoreFlow trace and InboundPlanReceived outbox event', async () => {
    const bundle = repoBundle();
    const result = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    expect(result.Status).toBe(InboundPlanDocumentStatus.Planned);
    expect(result.GateInStatus).toBe(InboundGateInStatus.NotRecorded);
    expect(result.Lines).toHaveLength(1);
    expect(result.IsDuplicate).toBe(false);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.coreFlows.CreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({ CurrentStage: CoreFlowStageCode.Inbound }),
    );
    expect(bundle.integrations.CreateOutboxMessage).toHaveBeenCalledWith(
      expect.objectContaining({ EventType: 'InboundPlanReceived', Status: OutboxMessageStatus.Pending }),
      undefined,
    );
    expect(bundle.audited.Entries).toHaveLength(1);
    expect(bundle.audited.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.InboundPlan,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
    });
  });

  it('dedupes duplicate source document by business key without double CoreFlow or outbox effect', async () => {
    const bundle = repoBundle();
    const useCase = createUseCase(bundle);

    await useCase.Execute(createRequest(), SystemAuditContext);
    const duplicate = await useCase.Execute(createRequest(), SystemAuditContext);

    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.coreFlows.Instances).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(1);
    expect(bundle.audited.Entries).toHaveLength(2);
    expect(bundle.audited.Entries[1]).toMatchObject({ ReferenceType: 'InboundPlanDuplicate' });
  });

  it('returns existing inbound plan when unique conflict happens after duplicate precheck', async () => {
    const bundle = repoBundle();
    const useCase = createUseCase(bundle);

    const created = await useCase.Execute(createRequest(), SystemAuditContext);
    bundle.inbound.MissBusinessKeyOnce = true;
    bundle.inbound.ThrowConflictOnCreate = true;
    const duplicate = await useCase.Execute(createRequest(), SystemAuditContext);

    expect(duplicate.Id).toBe(created.Id);
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.inbound.CreateCalls).toBe(2);
    expect(bundle.inbound.Plans).toHaveLength(1);
    expect(bundle.coreFlows.Instances).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(1);
  });

  it('rejects missing supplier before persistence and downstream effects', async () => {
    const bundle = repoBundle();
    bundle.partners.FindById.mockResolvedValue(null as never);

    await expect(createUseCase(bundle).Execute(createRequest(), SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );

    expect(bundle.inbound.CreateCalls).toBe(0);
    expect(bundle.coreFlows.CreateInstance).not.toHaveBeenCalled();
    expect(bundle.integrations.CreateOutboxMessage).not.toHaveBeenCalled();
  });

  it('rejects missing WarehouseProfile before persistence and downstream effects', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(null as never);

    await expect(createUseCase(bundle).Execute(createRequest(), SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );

    expect(bundle.inbound.CreateCalls).toBe(0);
    expect(bundle.coreFlows.CreateInstance).not.toHaveBeenCalled();
    expect(bundle.integrations.CreateOutboxMessage).not.toHaveBeenCalled();
  });

  it('records gate-in milestone on plan and CoreFlow', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const gateIn = await recordGateInUseCase(bundle).Execute(
      {
        Id: created.Id,
        GateInAt: new Date('2026-06-22T09:00:00.000Z'),
        GateReference: 'GATE-A-001',
        VehicleNumber: '51C-12345',
        DriverName: 'Driver A',
        EvidenceRefs: ['photo://gate-a-001'],
      },
      SystemAuditContext,
    );

    expect(gateIn.GateInStatus).toBe(InboundGateInStatus.Recorded);
    expect(bundle.coreFlows.CreateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        StageCode: CoreFlowStageCode.Inbound,
        StepCode: CoreFlowStepCode.GateInRecorded,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
      }),
      undefined,
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InboundPlan,
      ReferenceType: 'InboundGateIn',
    });
  });

  it('keeps repeated gate-in idempotent for same reference and rejects a different repeated reference', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const gateInUseCase = recordGateInUseCase(bundle);

    await gateInUseCase.Execute({ Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' }, SystemAuditContext);
    const repeated = await gateInUseCase.Execute(
      { Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' },
      SystemAuditContext,
    );

    expect(repeated.GateInStatus).toBe(InboundGateInStatus.Recorded);
    expect(bundle.coreFlows.Milestones).toHaveLength(1);
    await expect(
      gateInUseCase.Execute({ Id: created.Id, GateInAt: now, GateReference: 'GATE-A-002' }, SystemAuditContext),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('blocks receiving readiness when profile requires gate-in and allows after gate-in is recorded', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const readiness = readinessUseCase(bundle);

    const blocked = await readiness.Execute({ Id: created.Id }, SystemAuditContext);
    expect(blocked.Allowed).toBe(false);
    expect(blocked.Blocked).toBe(true);
    expect(blocked.GateInRequired).toBe(true);

    await recordGateInUseCase(bundle).Execute(
      { Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' },
      SystemAuditContext,
    );
    const allowed = await readiness.Execute({ Id: created.Id }, SystemAuditContext);
    expect(allowed.Allowed).toBe(true);
    expect(allowed.GateInRecorded).toBe(true);
  });

  it('fails receiving readiness closed when persisted WarehouseProfile cannot be resolved', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    bundle.profiles.FindById.mockResolvedValue(null as never);

    await expect(readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
  });

  it('allows gate-in readiness override only with CoreFlow override permission and reason', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const result = await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.Allowed).toBe(true);
    expect(result.OverrideAccepted).toBe(true);
    expect(bundle.permissionChecker.Check).toHaveBeenCalledWith(
      expect.objectContaining({ Action: ActionCode.Override, ObjectType: ObjectType.CoreFlow }),
    );
    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.GateInStatus).toBe(InboundGateInStatus.OverrideAccepted);
    const afterOverride = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);
    expect(afterOverride.Decision).toBe('OverrideAccepted');
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
      ReasonCodeId: 'reason-1',
    });
  });

  it('rejects gate-in readiness override when WarehouseProfile does not allow it', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    await expect(
      readinessUseCase(bundle).Execute(
        { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('lists inbound plans with default PageSize 50 and max PageSize 100 clamp', async () => {
    const bundle = repoBundle();
    const created = (await createUseCase(bundle).Execute(createRequest(), SystemAuditContext)) as InboundPlanDto;
    expect(await new GetInboundPlanUseCase(bundle.inbound).Execute(created.Id)).toMatchObject({ Id: created.Id });

    const listUseCase = new ListInboundPlansUseCase(bundle.inbound);
    const defaultPage = await listUseCase.Execute({});
    const clampedPage = await listUseCase.Execute({ Page: 1, PageSize: 500 });

    expect(defaultPage.Meta.PageSize).toBe(50);
    expect(clampedPage.Meta.PageSize).toBe(100);
  });
});
