import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { ImportOutboundOrderDto } from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import { OutboundOrderAggregate } from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { OutboundOrderLifecycleService } from '@modules/Outbound/Application/Services/OutboundOrderLifecycleService';
import { OutboundOrderEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

const now = new Date('2026-06-24T00:00:00.000Z');

const ctx: AuditContext = {
  ActorUserId: 'user-1',
  ActorRoleCodes: ['OUTBOUND_OPERATOR'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const makeOwner = (overrides: Partial<OwnerEntity> = {}) =>
  new OwnerEntity({
    Id: overrides.Id ?? 'owner-1',
    OwnerCode: overrides.OwnerCode ?? 'OWN-01',
    OwnerName: overrides.OwnerName ?? 'Owner 01',
    Status: overrides.Status ?? MasterDataStatus.Active,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeWarehouse = (overrides: Partial<WarehouseEntity> = {}) =>
  new WarehouseEntity({
    Id: overrides.Id ?? 'warehouse-1',
    SiteId: overrides.SiteId ?? 'site-1',
    WarehouseCode: overrides.WarehouseCode ?? 'WT-01',
    WarehouseName: overrides.WarehouseName ?? 'Warehouse WT-01',
    WarehouseTypeCode: overrides.WarehouseTypeCode ?? 'AMBIENT',
    Status: overrides.Status ?? MasterDataStatus.Active,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeSku = (overrides: Partial<SkuEntity> = {}) =>
  new SkuEntity({
    Id: overrides.Id ?? 'sku-1',
    SkuCode: overrides.SkuCode ?? 'SKU-001',
    SkuName: overrides.SkuName ?? 'SKU 001',
    DefaultOwnerId: overrides.DefaultOwnerId ?? 'owner-1',
    ItemClass: overrides.ItemClass ?? 'NORMAL',
    ItemStatus: overrides.ItemStatus ?? SkuStatus.Active,
    BaseUomId: overrides.BaseUomId ?? 'uom-1',
    InventoryUomId: overrides.InventoryUomId ?? 'uom-1',
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeUom = (overrides: Partial<UomEntity> = {}) =>
  new UomEntity({
    Id: overrides.Id ?? 'uom-1',
    UomCode: overrides.UomCode ?? 'EA',
    UomName: overrides.UomName ?? 'Each',
    Status: overrides.Status ?? MasterDataStatus.Active,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeCustomer = (overrides: Partial<PartnerEntity> = {}) =>
  new PartnerEntity({
    Id: overrides.Id ?? 'customer-1',
    PartnerCode: overrides.PartnerCode ?? 'CUS-001',
    PartnerName: overrides.PartnerName ?? 'Customer 001',
    PartnerType: overrides.PartnerType ?? PartnerType.Customer,
    Status: overrides.Status ?? PartnerStatus.Active,
    SourceSystem: overrides.SourceSystem ?? 'ERP',
    ExternalReference: overrides.ExternalReference ?? 'ERP-CUS-001',
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeCoverage = (overrides: Partial<ItemCoverageEntity> = {}) =>
  new ItemCoverageEntity({
    Id: overrides.Id ?? 'coverage-1',
    SkuId: overrides.SkuId ?? 'sku-1',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-1',
    OwnerId: overrides.OwnerId ?? 'owner-1',
    Status: overrides.Status ?? MasterDataStatus.Active,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const validImport = (overrides: Partial<ImportOutboundOrderDto> = {}): ImportOutboundOrderDto => ({
  SourceSystem: 'ERP',
  SourceReference: 'SO-001',
  CustomerId: 'customer-1',
  CustomerExternalReference: null,
  ShipToReference: 'SHIP-01',
  OwnerId: 'owner-1',
  WarehouseId: 'warehouse-1',
  Priority: 10,
  IdempotencyKey: 'outbound-import-1',
  Lines: [
    {
      LineNumber: 1,
      SkuId: 'sku-1',
      UomId: 'uom-1',
      OrderedQuantity: 12,
      ExternalLineReference: 'SO-001-1',
    },
  ],
  ...overrides,
});

class MemoryOutboundOrderRepository {
  public aggregates: OutboundOrderAggregate[] = [];

  async Create(order: OutboundOrderEntity, lines: OutboundOrderLineEntity[]): Promise<OutboundOrderAggregate> {
    if (this.aggregates.some((item) => item.Order.ImportIdempotencyKey === order.ImportIdempotencyKey)) {
      throw new ConflictException('duplicate outbound import idempotency');
    }
    if (
      this.aggregates.some(
        (item) =>
          item.Order.SourceSystem === order.SourceSystem &&
          item.Order.SourceReference === order.SourceReference &&
          item.Order.OwnerId === order.OwnerId &&
          item.Order.WarehouseId === order.WarehouseId,
      )
    ) {
      throw new ConflictException('duplicate outbound source reference');
    }
    const aggregate = { Order: order, Lines: lines };
    this.aggregates.push(aggregate);
    return aggregate;
  }

  async UpdateOrder(order: OutboundOrderEntity): Promise<OutboundOrderEntity> {
    const index = this.aggregates.findIndex((item) => item.Order.Id === order.Id);
    if (index < 0) throw new Error('outbound order not found');
    this.aggregates[index] = { ...this.aggregates[index], Order: order };
    return order;
  }

  async UpdateAggregate(order: OutboundOrderEntity, lines: OutboundOrderLineEntity[]): Promise<OutboundOrderAggregate> {
    const index = this.aggregates.findIndex((item) => item.Order.Id === order.Id);
    if (index < 0) throw new Error('outbound order not found');
    const aggregate = { Order: order, Lines: lines };
    this.aggregates[index] = aggregate;
    return aggregate;
  }

  async FindById(id: string): Promise<OutboundOrderAggregate | null> {
    return this.aggregates.find((item) => item.Order.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<OutboundOrderAggregate | null> {
    return this.FindById(id);
  }

  async FindByBusinessKey(
    sourceSystem: string,
    sourceReference: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<OutboundOrderAggregate | null> {
    return (
      this.aggregates.find(
        (item) =>
          item.Order.SourceSystem === sourceSystem &&
          item.Order.SourceReference === sourceReference &&
          item.Order.OwnerId === ownerId &&
          item.Order.WarehouseId === warehouseId,
      ) ?? null
    );
  }

  async FindByIdempotencyKey(idempotencyKey: string): Promise<OutboundOrderAggregate | null> {
    return this.aggregates.find((item) => item.Order.ImportIdempotencyKey === idempotencyKey) ?? null;
  }

  async ListCandidates(): Promise<OutboundOrderAggregate[]> {
    return [...this.aggregates];
  }
}

class MemoryMasterRepository<T extends { Id: string }> {
  constructor(public items: T[]) {}

  async FindById(id: string): Promise<T | null> {
    return this.items.find((item) => item.Id === id) ?? null;
  }

  async FindByCode(_code: string): Promise<T | null> {
    void _code;
    return null;
  }

  async Create(entity: T): Promise<T> {
    this.items.push(entity);
    return entity;
  }

  async Update(entity: T): Promise<T> {
    const index = this.items.findIndex((item) => item.Id === entity.Id);
    if (index >= 0) this.items[index] = entity;
    return entity;
  }

  async List(): Promise<{ Items: T[]; TotalItems: number }> {
    return { Items: this.items, TotalItems: this.items.length };
  }
}

class MemoryPartnerRepository extends MemoryMasterRepository<PartnerEntity> {
  async FindByCode(partnerCode: string): Promise<PartnerEntity | null> {
    return this.items.find((item) => item.PartnerCode === partnerCode) ?? null;
  }

  async FindByExternalReference(
    partnerType: PartnerType,
    sourceSystem: string,
    externalReference: string,
  ): Promise<PartnerEntity | null> {
    return (
      this.items.find(
        (item) =>
          item.PartnerType === partnerType &&
          item.SourceSystem === sourceSystem &&
          item.ExternalReference === externalReference,
      ) ?? null
    );
  }
}

class MemoryItemCoverageRepository extends MemoryMasterRepository<ItemCoverageEntity> {
  async FindBySkuWarehouseOwner(
    skuId: string,
    warehouseId: string,
    ownerId: string | null,
  ): Promise<ItemCoverageEntity | null> {
    return (
      this.items.find((item) => item.SkuId === skuId && item.WarehouseId === warehouseId && item.OwnerId === ownerId) ??
      null
    );
  }
}

class MemoryCoreFlowRepository {
  public instances: CoreFlowInstanceEntity[] = [];
  public milestones: WorkflowMilestoneEntity[] = [];
  public handoffs: WorkflowHandoffEntity[] = [];

  async CreateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.instances.push(instance);
    return instance;
  }

  async UpdateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    return instance;
  }

  async FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instances.find((item) => item.Id === id) ?? null;
  }

  async FindInstanceByBusinessReference(businessReference: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instances.find((item) => item.BusinessReference === businessReference) ?? null;
  }

  async CreateMilestone(milestone: WorkflowMilestoneEntity): Promise<WorkflowMilestoneEntity> {
    this.milestones.push(milestone);
    return milestone;
  }

  async ListMilestones(): Promise<WorkflowMilestoneEntity[]> {
    return this.milestones;
  }

  async CreateHandoff(handoff: WorkflowHandoffEntity): Promise<WorkflowHandoffEntity> {
    this.handoffs.push(handoff);
    return handoff;
  }
}

class MemoryIntegrationRepository {
  public outbox: OutboxMessageEntity[] = [];

  async FindInterfaceMessageByMessageId(): Promise<null> {
    return null;
  }

  async FindOutboxMessageByMessageId(messageId: string): Promise<OutboxMessageEntity | null> {
    return this.outbox.find((item) => item.MessageId === messageId) ?? null;
  }

  async CreateImport(importBatch: never, interfaceMessages: never[], outboxMessages: OutboxMessageEntity[]) {
    return { ImportBatch: importBatch, InterfaceMessages: interfaceMessages, OutboxMessages: outboxMessages };
  }

  async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.outbox.push(outboxMessage);
    return outboxMessage;
  }

  async ListImportBatches(): Promise<{ Items: never[]; TotalItems: number }> {
    return { Items: [], TotalItems: 0 };
  }

  async ListOutboxMessages(): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    return { Items: this.outbox, TotalItems: this.outbox.length };
  }
}

class SimpleReasonCatalog implements IReasonCodeCatalog {
  async ValidateReason(input: Parameters<IReasonCodeCatalog['ValidateReason']>[0]) {
    if (input.ObjectType !== ObjectType.OutboundOrder) throw new BusinessRuleException('wrong object');
    return {
      ReasonCodeId: `reason-${input.ReasonCode}`,
      EvidenceRequired: input.ReasonCode === 'RC-V1-DISCREPANCY',
      ApprovalRequired: false,
    };
  }
}

class AllowAllPermissionChecker implements IPermissionChecker {
  public checks: Parameters<IPermissionChecker['Check']>[0][] = [];

  async Check(input: Parameters<IPermissionChecker['Check']>[0]) {
    this.checks.push(input);
    return { Allowed: true };
  }
}

class DenyPermissionChecker extends AllowAllPermissionChecker {
  async Check(input: Parameters<IPermissionChecker['Check']>[0]) {
    this.checks.push(input);
    return { Allowed: false, Reason: 'PERMISSION_DENIED' as const };
  }
}

class CapturingAuditedTransaction {
  public entries: AuditEntry[] = [];

  async Run<T>(work: (manager: never) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>): Promise<T> {
    const { result, entry } = await work(undefined as never);
    this.entries.push(...(Array.isArray(entry) ? entry : [entry]));
    return result;
  }
}

class MemoryPickReleaseRepository implements Partial<IPickReleaseRepository> {
  public active: PickReleaseAggregate | null = null;

  async FindActiveByOutboundOrderId(outboundOrderId: string): Promise<PickReleaseAggregate | null> {
    return this.active?.Release.OutboundOrderId === outboundOrderId ? this.active : null;
  }
}

function activePickRelease(outboundOrderId: string): PickReleaseAggregate {
  return {
    Release: new PickReleaseEntity({
      Id: 'release-active',
      ReleaseNumber: 'REL-ACTIVE',
      OutboundOrderId: outboundOrderId,
      AllocationId: 'allocation-1',
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WT-01',
      OwnerId: 'owner-1',
      OwnerCode: 'OWN-01',
      ReleaseMode: PickReleaseMode.Discrete,
      BatchSize: 50,
      Status: PickReleaseStatus.Released,
      TotalTaskCount: 1,
      TotalReleasedQuantity: 12,
      IdempotencyKey: 'release-active',
      PayloadFingerprint: 'release-fingerprint',
      CreatedAt: now,
      UpdatedAt: now,
    }),
    Tasks: [],
  };
}

const buildService = (
  overrides: Partial<{
    partners: MemoryPartnerRepository;
    owners: MemoryMasterRepository<OwnerEntity>;
    warehouses: MemoryMasterRepository<WarehouseEntity>;
    skus: MemoryMasterRepository<SkuEntity>;
    uoms: MemoryMasterRepository<UomEntity>;
    itemCoverages: MemoryItemCoverageRepository;
    permissions: IPermissionChecker;
    pickReleases: MemoryPickReleaseRepository;
  }> = {},
) => {
  const outbound = new MemoryOutboundOrderRepository();
  const coreFlows = new MemoryCoreFlowRepository();
  const integrations = new MemoryIntegrationRepository();
  const audited = new CapturingAuditedTransaction();
  const permissions = overrides.permissions ?? new AllowAllPermissionChecker();
  const service = new OutboundOrderLifecycleService(
    outbound,
    overrides.partners ?? new MemoryPartnerRepository([makeCustomer()]),
    overrides.owners ?? new MemoryMasterRepository([makeOwner()]),
    overrides.warehouses ?? new MemoryMasterRepository([makeWarehouse()]),
    overrides.skus ?? new MemoryMasterRepository([makeSku()]),
    overrides.uoms ?? new MemoryMasterRepository([makeUom()]),
    overrides.itemCoverages ?? new MemoryItemCoverageRepository([makeCoverage()]),
    coreFlows,
    integrations,
    new SimpleReasonCatalog(),
    audited as unknown as AuditedTransaction,
    permissions,
    (overrides.pickReleases ?? new MemoryPickReleaseRepository()) as unknown as IPickReleaseRepository,
  );
  return { service, outbound, coreFlows, integrations, audited, permissions };
};

describe('OutboundOrderLifecycleService', () => {
  it('imports a valid outbound order with permission, core-flow milestone, outbox and audit evidence', async () => {
    const { service, coreFlows, integrations, audited, permissions } = buildService();

    const result = await service.Import(validImport(), ctx);

    expect(result.DocumentStatus).toBe(OutboundOrderStatus.Validated);
    expect(result.BusinessReference).toBe('ERP:OUTBOUND:SO-001');
    expect(result.CustomerCode).toBe('CUS-001');
    expect(result.WarehouseCode).toBe('WT-01');
    expect(result.Lines[0].SkuCode).toBe('SKU-001');
    expect(result.IsDuplicate).toBe(false);
    expect(coreFlows.instances).toHaveLength(1);
    expect(coreFlows.milestones).toHaveLength(1);
    expect(integrations.outbox).toHaveLength(1);
    expect(integrations.outbox[0].EventType).toBe('OutboundOrderReceived');
    expect(audited.entries[0].ObjectType).toBe(ObjectType.OutboundOrder);
    expect((permissions as AllowAllPermissionChecker).checks[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.OutboundOrder,
    });
  });

  it('deduplicates same import payload and rejects same idempotency/source reference with different payload', async () => {
    const { service } = buildService();

    const created = await service.Import(validImport(), ctx);
    const duplicate = await service.Import(validImport(), ctx);
    const duplicateBySource = await service.Import(validImport({ IdempotencyKey: 'outbound-import-2' }), ctx);

    expect(duplicate.IsDuplicate).toBe(true);
    expect(duplicate.Id).toBe(created.Id);
    expect(duplicateBySource.IsDuplicate).toBe(true);
    expect(duplicateBySource.Id).toBe(created.Id);

    await expect(
      service.Import(
        validImport({
          Lines: [
            {
              LineNumber: 1,
              SkuId: 'sku-1',
              UomId: 'uom-1',
              OrderedQuantity: 13,
              ExternalLineReference: 'SO-001-1',
            },
          ],
        }),
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps invalid master-data import as Held document with validation evidence and no allocation status', async () => {
    const { service, integrations, audited } = buildService({
      partners: new MemoryPartnerRepository([]),
      skus: new MemoryMasterRepository([]),
    });

    const result = await service.Import(
      validImport({
        CustomerId: null,
        CustomerExternalReference: 'ERP-MISSING-CUSTOMER',
        EvidenceRefs: [],
      }),
      ctx,
    );

    expect(result.DocumentStatus).toBe(OutboundOrderStatus.Held);
    expect(result.ValidationErrors).toEqual(
      expect.arrayContaining(['Customer not found or inactive', 'SKU not found or inactive at line 1']),
    );
    expect(result.ReasonCode).toBe('RC-V1-DISCREPANCY');
    expect(result.EvidenceRefs.length).toBeGreaterThan(0);
    expect(result.EvidenceRefs[0]).toContain('validation:');
    expect(integrations.outbox[0].EventType).toBe('OutboundOrderValidationFailed');
    expect(audited.entries[0].EvidenceRefs?.length).toBeGreaterThan(0);
  });

  it('revalidates a held order after missing master data becomes available', async () => {
    const skus = new MemoryMasterRepository<SkuEntity>([]);
    const itemCoverages = new MemoryItemCoverageRepository([makeCoverage()]);
    const { service, integrations, audited, coreFlows } = buildService({ skus, itemCoverages });
    const held = await service.Import(validImport(), ctx);

    expect(held.DocumentStatus).toBe(OutboundOrderStatus.Held);
    skus.items.push(makeSku());

    const validated = await service.Validate(held.Id, ctx);
    const duplicateValidate = await service.Validate(held.Id, ctx);

    expect(validated.DocumentStatus).toBe(OutboundOrderStatus.Validated);
    expect(validated.ValidationErrors).toEqual([]);
    expect(validated.Lines[0].ValidationErrors).toEqual([]);
    expect(duplicateValidate.IsDuplicate).toBe(false);
    expect(integrations.outbox.map((item) => item.EventType)).toEqual([
      'OutboundOrderValidationFailed',
      'OutboundOrderValidated',
    ]);
    expect(audited.entries).toHaveLength(2);
    expect(coreFlows.milestones).toHaveLength(2);
  });

  it('revalidates a held order after missing customer external reference becomes available', async () => {
    const partners = new MemoryPartnerRepository([]);
    const { service, integrations } = buildService({ partners });
    const held = await service.Import(
      validImport({
        CustomerId: null,
        CustomerSourceSystem: 'ERP',
        CustomerExternalReference: 'ERP-CUS-001',
        IdempotencyKey: 'outbound-import-missing-customer',
      }),
      ctx,
    );

    expect(held.DocumentStatus).toBe(OutboundOrderStatus.Held);
    expect(held.ValidationErrors).toContain('Customer not found or inactive');
    partners.items.push(makeCustomer());

    const validated = await service.Validate(held.Id, ctx);

    expect(validated.DocumentStatus).toBe(OutboundOrderStatus.Validated);
    expect(validated.CustomerCode).toBe('CUS-001');
    expect(validated.CustomerExternalReference).toBe('ERP-CUS-001');
    expect(validated.ValidationErrors).toEqual([]);
    expect(integrations.outbox.map((item) => item.EventType)).toEqual([
      'OutboundOrderValidationFailed',
      'OutboundOrderValidated',
    ]);
  });

  it('records hold action outbox once and rejects action idempotency key reuse with different payload', async () => {
    const { service, integrations, audited } = buildService();
    const created = await service.Import(validImport(), ctx);

    const held = await service.Hold(
      {
        Id: created.Id,
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'Chờ xác minh customer',
        EvidenceRefs: ['case:hold-1'],
        IdempotencyKey: 'hold-action-1',
      },
      ctx,
    );
    const duplicate = await service.Hold(
      {
        Id: created.Id,
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'Chờ xác minh customer',
        EvidenceRefs: ['case:hold-1'],
        IdempotencyKey: 'hold-action-1',
      },
      ctx,
    );

    expect(held.DocumentStatus).toBe(OutboundOrderStatus.Held);
    expect(duplicate.IsDuplicate).toBe(true);
    expect(integrations.outbox.map((item) => item.EventType)).toEqual(['OutboundOrderReceived', 'OutboundOrderHeld']);
    expect(integrations.outbox[1].MessageId).toContain('OutboundOrderHeld');
    expect(integrations.outbox[1].MessageId.length).toBeLessThanOrEqual(120);
    expect(audited.entries).toHaveLength(2);

    await expect(
      service.Hold(
        {
          Id: created.Id,
          ReasonCode: 'RC-V1-DISCREPANCY',
          ReasonNote: 'Payload khác',
          EvidenceRefs: ['case:hold-1'],
          IdempotencyKey: 'hold-action-1',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks outbound document mutations after active pick release exists', async () => {
    const pickReleases = new MemoryPickReleaseRepository();
    const { service } = buildService({ pickReleases });
    const created = await service.Import(validImport(), ctx);
    pickReleases.active = activePickRelease(created.Id);

    await expect(service.Validate(created.Id, ctx)).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      service.Hold(
        {
          Id: created.Id,
          ReasonCode: 'RC-V1-DISCREPANCY',
          ReasonNote: 'Không được hold sau release',
          EvidenceRefs: ['release-active:1'],
          IdempotencyKey: 'hold-after-release',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      service.Cancel(
        {
          Id: created.Id,
          ReasonCode: 'RC-V1-DISCREPANCY',
          ReasonNote: 'Không được cancel sau release',
          EvidenceRefs: ['release-active:1'],
          IdempotencyKey: 'cancel-after-release',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      service.Reject(
        {
          Id: created.Id,
          ReasonCode: 'RC-V1-DISCREPANCY',
          ReasonNote: 'Không được reject sau release',
          EvidenceRefs: ['release-active:1'],
          IdempotencyKey: 'reject-after-release',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('enforces PageSize max 100 and filters list by read permission', async () => {
    const { service, permissions } = buildService();
    await service.Import(validImport(), ctx);

    const page = await service.List({ Page: 1, PageSize: 50 }, ctx.ActorUserId);
    expect(page.Items).toHaveLength(1);
    expect((permissions as AllowAllPermissionChecker).checks.some((item) => item.Action === ActionCode.Read)).toBe(
      true,
    );

    await expect(service.List({ Page: 1, PageSize: 101 }, ctx.ActorUserId)).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('denies import when RBAC scope denies OutboundOrder create', async () => {
    const { service } = buildService({ permissions: new DenyPermissionChecker() });

    await expect(service.Import(validImport(), ctx)).rejects.toBeInstanceOf(ForbiddenAppException);
  });
});
