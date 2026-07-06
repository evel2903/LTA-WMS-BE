import { createHash, randomUUID } from 'crypto';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { EntityManager } from 'typeorm';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import {
  AllocateOutboundOrderDto,
  AllocationDto,
  ListAllocationsDto,
} from '@modules/Outbound/Application/DTOs/AllocationDto';
import {
  AllocationAggregate,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import {
  AllocationInventoryCandidate,
  IAllocationInventoryRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationInventoryRepository';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { AllocationDtoMapper } from '@modules/Outbound/Application/Mappers/AllocationDtoMapper';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface NormalizedAllocateRequest extends AllocateOutboundOrderDto {
  Policy: AllocationPolicy;
  ReasonCode: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface PlannedLineInput {
  OrderLine: OutboundOrderLineEntity;
  OrderedQuantity: number;
  AllocatedQuantity: number;
  BackorderedQuantity: number;
  Candidate?: AllocationInventoryCandidate;
  Status: AllocationStatus;
  ShortageReason?: string | null;
}

interface AllocationPlan {
  Status: AllocationStatus;
  TotalOrderedQuantity: number;
  TotalAllocatedQuantity: number;
  TotalBackorderedQuantity: number;
  ShortageReason: string | null;
  Lines: PlannedLineInput[];
  BalanceMutations: Array<{ Balance: InventoryBalanceEntity; ReservedDelta: number }>;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SHORTAGE_REASON_CODE = 'RC-V1-DISCREPANCY';

export class AllocationLifecycleService {
  constructor(
    private readonly allocations: IAllocationRepository,
    private readonly allocationInventory: IAllocationInventoryRepository,
    private readonly outboundOrders: IOutboundOrderRepository,
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Allocate(request: AllocateOutboundOrderDto, context: AuditContext): Promise<AllocationDto> {
    const normalized = this.NormalizeAllocateRequest(request);
    const aggregate = await this.outboundOrders.FindById(normalized.OutboundOrderId);
    if (!aggregate) throw new NotFoundException('Outbound order not found');
    await this.AssertAllocationPermission(context.ActorUserId, ActionCode.Create, aggregate.Order);

    const fingerprint = this.Fingerprint('AllocateOutboundOrder', this.AllocationFingerprintPayload(normalized));
    const duplicate = await this.allocations.FindByIdempotencyKey(normalized.IdempotencyKey);
    if (duplicate) return this.ReturnDuplicate(duplicate, normalized.OutboundOrderId, fingerprint);

    return this.audited.Run(async (manager) => {
      const current = await this.outboundOrders.FindByIdForUpdate(normalized.OutboundOrderId, manager);
      if (!current) throw new NotFoundException('Outbound order not found');
      await this.AssertAllocationPermission(context.ActorUserId, ActionCode.Create, current.Order);
      this.AssertOrderCanAllocate(current.Order.DocumentStatus);

      const duplicateInTx = await this.allocations.FindByIdempotencyKey(normalized.IdempotencyKey, manager);
      if (duplicateInTx) {
        throw new ConflictException('Allocation idempotency key was already used in this transaction');
      }
      const active = await this.allocations.FindActiveByOutboundOrderId(current.Order.Id, manager);
      if (active) {
        throw new ConflictException('Outbound order already has an active allocation', {
          OutboundOrderId: current.Order.Id,
          AllocationId: active.Allocation.Id,
        });
      }

      const plan = await this.BuildPlan(
        current.Lines,
        current.Order.WarehouseId,
        current.Order.OwnerId,
        normalized.Policy,
        manager,
      );
      const needsReason = plan.TotalBackorderedQuantity > 0 || plan.Status === AllocationStatus.Failed;
      const reason =
        needsReason || normalized.ReasonCode
          ? await this.ResolveReason(
              normalized.ReasonCode ?? DEFAULT_SHORTAGE_REASON_CODE,
              normalized.ReasonNote,
              normalized.EvidenceRefs,
            )
          : null;

      const now = new Date();
      const allocationId = randomUUID();
      const outboxId = randomUUID();
      const allocation = new AllocationEntity({
        Id: allocationId,
        AllocationNumber: `AL-${now.getTime()}-${allocationId.slice(0, 6).toUpperCase()}`,
        OutboundOrderId: current.Order.Id,
        WarehouseId: current.Order.WarehouseId,
        WarehouseCode: current.Order.WarehouseCode,
        OwnerId: current.Order.OwnerId,
        OwnerCode: current.Order.OwnerCode,
        Policy: normalized.Policy,
        Status: plan.Status,
        TotalOrderedQuantity: plan.TotalOrderedQuantity,
        TotalAllocatedQuantity: plan.TotalAllocatedQuantity,
        TotalBackorderedQuantity: plan.TotalBackorderedQuantity,
        ShortageReason: plan.ShortageReason,
        OutboxMessageId: outboxId,
        IdempotencyKey: normalized.IdempotencyKey,
        PayloadFingerprint: fingerprint,
        ReasonCode: reason?.ReasonCode ?? null,
        ReasonCodeId: reason?.ReasonCodeId ?? null,
        ReasonNote: reason?.ReasonNote ?? null,
        EvidenceRefs: reason?.EvidenceRefs ?? [],
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: context.ActorUserId,
        UpdatedBy: context.ActorUserId,
      });
      const lines = plan.Lines.map((line) => this.BuildAllocationLine(allocationId, line, now));

      if (plan.Status !== AllocationStatus.Failed) {
        for (const mutation of plan.BalanceMutations) {
          await this.inventoryBalances.Update(
            new InventoryBalanceEntity({
              ...mutation.Balance,
              QtyReserved: mutation.Balance.QtyReserved + mutation.ReservedDelta,
              UpdatedAt: now,
              UpdatedBy: context.ActorUserId,
            }),
            manager,
          );
        }
      }

      const saved = await this.allocations.Create(allocation, lines, manager);
      const dto = AllocationDtoMapper.ToDto(saved);
      await this.integrations.CreateOutboxMessage(
        this.BuildOutbox(
          outboxId,
          current,
          saved,
          plan.Status === AllocationStatus.Failed ? 'AllocationFailed' : 'AllocationCreated',
        ),
        manager,
      );
      if (current.Order.CoreFlowInstanceId) {
        await this.coreFlows.CreateMilestone(
          this.BuildMilestone(current.Order.CoreFlowInstanceId, saved, context.ActorUserId),
          manager,
        );
      }

      return {
        result: dto,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Create,
          ObjectType: ObjectType.Allocation,
          ObjectId: saved.Allocation.Id,
          ObjectCode: saved.Allocation.AllocationNumber,
          AfterJson: dto as unknown as Record<string, unknown>,
          ReasonCodeId: reason?.ReasonCodeId ?? null,
          ReasonNote: reason?.ReasonNote ?? null,
          EvidenceRefs: reason?.EvidenceRefs ?? [],
          ReferenceType: 'OutboundAllocation',
          ReferenceId: current.Order.Id,
          WarehouseId: current.Order.WarehouseId,
          OwnerId: current.Order.OwnerId,
        }),
      };
    });
  }

  public async List(query: ListAllocationsDto, actorUserId?: string | null) {
    this.AssertPageSize(query.PageSize);
    const order = await this.outboundOrders.FindById(query.OutboundOrderId);
    if (!order) throw new NotFoundException('Outbound order not found');
    await this.AssertAllocationPermission(actorUserId, ActionCode.Read, order.Order);
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: DEFAULT_PAGE_SIZE, MaxPageSize: MAX_PAGE_SIZE },
    );
    const candidates = await this.allocations.ListCandidates(query);
    return ToPagedResult(
      candidates.slice(paging.Skip, paging.Skip + paging.Take).map((item) => AllocationDtoMapper.ToDto(item)),
      candidates.length,
      paging.Page,
      paging.PageSize,
    );
  }

  public async Get(id: string, actorUserId?: string | null): Promise<AllocationDto> {
    const aggregate = await this.allocations.FindById(id);
    if (!aggregate) throw new NotFoundException('Allocation not found');
    await this.AssertAllocationPermission(actorUserId, ActionCode.Read, aggregate.Allocation);
    return AllocationDtoMapper.ToDto(aggregate);
  }

  private async BuildPlan(
    lines: OutboundOrderLineEntity[],
    warehouseId: string,
    ownerId: string,
    policy: AllocationPolicy,
    manager: EntityManager,
  ): Promise<AllocationPlan> {
    const planned: PlannedLineInput[] = [];
    const balancePlans = new Map<string, { Balance: InventoryBalanceEntity; ReservedDelta: number }>();
    let totalOrdered = 0;
    let totalAllocated = 0;
    let totalBackordered = 0;

    for (const line of lines.slice().sort((left, right) => left.LineNumber - right.LineNumber)) {
      // IFB-14: RequestedSerialNumber pins allocation to exactly one specific physical unit --
      // requesting that one serial for more than 1 unit is a logical contradiction (the balance
      // model has no way to represent "this exact serial, times 3"). Fail loud instead of letting
      // ListCandidates silently exact-match a multi-unit line against a single serial value.
      if (line.RequestedSerialNumber !== null && line.OrderedQuantity !== 1) {
        throw new BusinessRuleException(
          'RequestedSerialNumber requires OrderedQuantity = 1; split into separate lines to request multiple specific serials',
          {
            OutboundOrderLineId: line.Id,
            RequestedSerialNumber: line.RequestedSerialNumber,
            OrderedQuantity: line.OrderedQuantity,
          },
        );
      }
      let remaining = line.OrderedQuantity;
      totalOrdered += line.OrderedQuantity;
      const candidates = await this.allocationInventory.ListCandidates(
        {
          WarehouseId: warehouseId,
          OwnerId: ownerId,
          SkuId: line.SkuId,
          UomId: line.UomId,
          RequestedLotNumber: line.RequestedLotNumber,
          RequestedSerialNumber: line.RequestedSerialNumber,
        },
        manager,
      );

      for (const candidate of candidates) {
        if (remaining <= 0) break;
        const balancePlan = await this.GetBalancePlan(candidate, balancePlans, manager);
        const available = balancePlan.Balance.QtyAvailable - balancePlan.ReservedDelta;
        const quantity = Math.min(remaining, available);
        if (quantity <= 0) continue;
        // IFB-14 (dual-review patch): the RequestedSerialNumber check above only guards the
        // caller's stated intent -- it does nothing when a line doesn't request a specific serial
        // but FEFO/candidate matching incidentally resolves a serial-tagged dimension whose balance
        // itself already carries QtyOnHand > 1 (legacy data from before this fix, a cycle-count
        // adjustment, or any other future writer not gated the way receiving now is). Without this,
        // BuildAllocationLine would silently allocate >1 unit against one SerialNumber, reproducing
        // the exact defect downstream in the pick task this story exists to prevent.
        if (candidate.Dimension.SerialNumber !== null && quantity !== 1) {
          throw new BusinessRuleException(
            'Cannot allocate more than 1 unit from a single serial-tagged balance; the underlying inventory data is inconsistent',
            {
              OutboundOrderLineId: line.Id,
              DimensionId: candidate.Dimension.Id,
              SerialNumber: candidate.Dimension.SerialNumber,
              Quantity: quantity,
            },
          );
        }
        balancePlan.ReservedDelta += quantity;
        remaining -= quantity;
        totalAllocated += quantity;
        planned.push({
          OrderLine: line,
          OrderedQuantity: quantity,
          AllocatedQuantity: quantity,
          BackorderedQuantity: 0,
          Candidate: candidate,
          Status: AllocationStatus.Allocated,
        });
      }

      if (remaining > 0) {
        totalBackordered += remaining;
        planned.push({
          OrderLine: line,
          OrderedQuantity: remaining,
          AllocatedQuantity: 0,
          BackorderedQuantity: remaining,
          Status: AllocationStatus.Backordered,
          ShortageReason: 'Insufficient eligible Available inventory in order warehouse',
        });
      }
    }

    if (policy === AllocationPolicy.FullOnly && totalBackordered > 0) {
      return {
        Status: AllocationStatus.Failed,
        TotalOrderedQuantity: totalOrdered,
        TotalAllocatedQuantity: 0,
        TotalBackorderedQuantity: totalOrdered,
        ShortageReason: 'FullOnly allocation cannot reserve partially when eligible stock is short',
        Lines: lines.map((line) => ({
          OrderLine: line,
          OrderedQuantity: line.OrderedQuantity,
          AllocatedQuantity: 0,
          BackorderedQuantity: line.OrderedQuantity,
          Status: AllocationStatus.Failed,
          ShortageReason: 'FullOnly allocation cannot reserve partially when eligible stock is short',
        })),
        BalanceMutations: [],
      };
    }

    const status =
      totalAllocated === totalOrdered
        ? AllocationStatus.Allocated
        : totalAllocated > 0
          ? AllocationStatus.PartiallyAllocated
          : AllocationStatus.Failed;
    return {
      Status: status,
      TotalOrderedQuantity: totalOrdered,
      TotalAllocatedQuantity: status === AllocationStatus.Failed ? 0 : totalAllocated,
      TotalBackorderedQuantity: status === AllocationStatus.Failed ? totalOrdered : totalBackordered,
      ShortageReason:
        totalBackordered > 0 || status === AllocationStatus.Failed
          ? 'Insufficient eligible Available inventory in order warehouse'
          : null,
      Lines:
        status === AllocationStatus.Failed
          ? lines.map((line) => ({
              OrderLine: line,
              OrderedQuantity: line.OrderedQuantity,
              AllocatedQuantity: 0,
              BackorderedQuantity: line.OrderedQuantity,
              Status: AllocationStatus.Failed,
              ShortageReason: 'Insufficient eligible Available inventory in order warehouse',
            }))
          : planned,
      BalanceMutations:
        status === AllocationStatus.Failed
          ? []
          : Array.from(balancePlans.values()).filter((item) => item.ReservedDelta > 0),
    };
  }

  private async GetBalancePlan(
    candidate: AllocationInventoryCandidate,
    balancePlans: Map<string, { Balance: InventoryBalanceEntity; ReservedDelta: number }>,
    manager: EntityManager,
  ): Promise<{ Balance: InventoryBalanceEntity; ReservedDelta: number }> {
    const existing = balancePlans.get(candidate.Balance.Id);
    if (existing) return existing;
    const locked = await this.inventoryBalances.FindByDimensionIdForUpdate(candidate.Dimension.Id, manager);
    if (!locked) {
      throw new ConflictException('Allocation candidate balance disappeared before reservation lock', {
        DimensionId: candidate.Dimension.Id,
      });
    }
    const plan = { Balance: locked, ReservedDelta: 0 };
    balancePlans.set(candidate.Balance.Id, plan);
    return plan;
  }

  private BuildAllocationLine(allocationId: string, line: PlannedLineInput, now: Date): AllocationLineEntity {
    const dimension: InventoryDimensionEntity | undefined = line.Candidate?.Dimension;
    return new AllocationLineEntity({
      Id: randomUUID(),
      AllocationId: allocationId,
      OutboundOrderLineId: line.OrderLine.Id,
      LineNumber: line.OrderLine.LineNumber,
      SkuId: line.OrderLine.SkuId,
      SkuCode: line.OrderLine.SkuCode,
      UomId: line.OrderLine.UomId,
      UomCode: line.OrderLine.UomCode,
      OrderedQuantity: line.OrderedQuantity,
      AllocatedQuantity: line.AllocatedQuantity,
      BackorderedQuantity: line.BackorderedQuantity,
      SourceBalanceId: line.Candidate?.Balance.Id ?? null,
      SourceDimensionId: dimension?.Id ?? null,
      SourceLocationId: dimension?.LocationId ?? null,
      InventoryStatusCode: line.Candidate?.InventoryStatusCode ?? null,
      LotNumber: dimension?.LotNumber ?? null,
      SerialNumber: dimension?.SerialNumber ?? null,
      ExpiryDate: dimension?.ExpiryDate ?? null,
      Status: line.Status,
      ShortageReason: line.ShortageReason ?? null,
      CreatedAt: now,
    });
  }

  private async ResolveReason(
    reasonCode: string,
    reasonNote: string | null | undefined,
    evidenceRefs: string[],
  ): Promise<ReasonDecision> {
    const normalizedCode = reasonCode?.trim().toUpperCase();
    if (!normalizedCode) throw new BusinessRuleException('ReasonCode is required for allocation shortage/backorder');
    const normalizedEvidence = this.NormalizeEvidence(evidenceRefs);
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalizedCode,
      Action: ActionCode.Create,
      ObjectType: ObjectType.Allocation,
    });
    if (reason.EvidenceRequired && normalizedEvidence.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for this allocation reason', {
        ReasonCode: normalizedCode,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required allocation reason is not directly supported by V1-19', {
        ReasonCode: normalizedCode,
      });
    }
    return {
      ReasonCode: normalizedCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: reasonNote?.trim() || null,
      EvidenceRefs: normalizedEvidence,
    };
  }

  private ReturnDuplicate(
    aggregate: AllocationAggregate,
    outboundOrderId: string,
    expectedFingerprint: string,
  ): AllocationDto {
    if (
      aggregate.Allocation.OutboundOrderId !== outboundOrderId ||
      aggregate.Allocation.PayloadFingerprint !== expectedFingerprint
    ) {
      throw new ConflictException('Allocation idempotency key reused with different payload', {
        AllocationId: aggregate.Allocation.Id,
        OutboundOrderId: aggregate.Allocation.OutboundOrderId,
      });
    }
    return AllocationDtoMapper.ToDto(aggregate, true);
  }

  private BuildOutbox(
    id: string,
    orderAggregate: OutboundOrderAggregate,
    allocationAggregate: AllocationAggregate,
    eventType: 'AllocationCreated' | 'AllocationFailed',
  ): OutboxMessageEntity {
    const order = orderAggregate.Order;
    const allocation = allocationAggregate.Allocation;
    return new OutboxMessageEntity({
      Id: id,
      MessageId: `${eventType}:${allocation.Id}`,
      EventType: eventType,
      Version: '1.0',
      BusinessReference: allocation.AllocationNumber,
      SourceSystem: 'LTA-WMS',
      TargetSystem: order.SourceSystem,
      WarehouseContext: allocation.WarehouseCode ?? allocation.WarehouseId,
      OwnerContext: allocation.OwnerCode ?? allocation.OwnerId,
      EventTime: allocation.UpdatedAt,
      CorrelationId: order.CoreFlowInstanceId,
      CausationId: allocation.Id,
      Payload: {
        OutboundOrderId: order.Id,
        AllocationId: allocation.Id,
        AllocationNumber: allocation.AllocationNumber,
        Policy: allocation.Policy,
        AllocationStatus: allocation.Status,
        TotalOrderedQuantity: allocation.TotalOrderedQuantity,
        TotalAllocatedQuantity: allocation.TotalAllocatedQuantity,
        TotalBackorderedQuantity: allocation.TotalBackorderedQuantity,
        ShortageReason: allocation.ShortageReason,
        ReasonCode: allocation.ReasonCode,
        Lines: allocationAggregate.Lines.map((line) => ({
          OutboundOrderLineId: line.OutboundOrderLineId,
          LineNumber: line.LineNumber,
          SkuId: line.SkuId,
          UomId: line.UomId,
          OrderedQuantity: line.OrderedQuantity,
          AllocatedQuantity: line.AllocatedQuantity,
          BackorderedQuantity: line.BackorderedQuantity,
          SourceBalanceId: line.SourceBalanceId,
          SourceDimensionId: line.SourceDimensionId,
          SourceLocationId: line.SourceLocationId,
          InventoryStatusCode: line.InventoryStatusCode,
          LotNumber: line.LotNumber,
          SerialNumber: line.SerialNumber,
          ExpiryDate: line.ExpiryDate,
          Status: line.Status,
          ShortageReason: line.ShortageReason,
        })),
      },
      Status: OutboxMessageStatus.Pending,
      CreatedAt: allocation.UpdatedAt,
      CreatedBy: allocation.UpdatedBy ?? allocation.CreatedBy,
    });
  }

  private BuildMilestone(
    coreFlowInstanceId: string,
    allocationAggregate: AllocationAggregate,
    actorUserId: string | null,
  ): WorkflowMilestoneEntity {
    const allocation = allocationAggregate.Allocation;
    return new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: coreFlowInstanceId,
      StageCode: CoreFlowStageCode.Outbound,
      StepCode: CoreFlowStepCode.AllocationCompleted,
      MilestoneStatus:
        allocation.Status === AllocationStatus.Failed
          ? WorkflowMilestoneStatus.Blocked
          : WorkflowMilestoneStatus.Completed,
      Metadata: {
        AllocationId: allocation.Id,
        AllocationStatus: allocation.Status,
        TotalAllocatedQuantity: allocation.TotalAllocatedQuantity,
        TotalBackorderedQuantity: allocation.TotalBackorderedQuantity,
      },
      OccurredAt: allocation.UpdatedAt,
      CreatedBy: actorUserId,
    });
  }

  private async AssertAllocationPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    scope: { WarehouseId?: string | null; OwnerId?: string | null },
  ): Promise<void> {
    if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: ObjectType.Allocation,
      Scope: { WarehouseId: scope.WarehouseId ?? null, OwnerId: scope.OwnerId ?? null },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException('Permission denied for allocation action', {
        Action: action,
        ObjectType: ObjectType.Allocation,
        Reason: decision.Reason ?? 'PERMISSION_DENIED',
      });
    }
  }

  private AssertOrderCanAllocate(status: OutboundOrderStatus): void {
    if (status !== OutboundOrderStatus.Validated) {
      throw new BusinessRuleException('Only validated outbound orders can be allocated', {
        DocumentStatus: status,
      });
    }
  }

  private NormalizeAllocateRequest(request: AllocateOutboundOrderDto): NormalizedAllocateRequest {
    const policy = this.NormalizePolicy(request.Policy);
    const normalized: NormalizedAllocateRequest = {
      OutboundOrderId: request.OutboundOrderId?.trim() ?? '',
      Policy: policy,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.OutboundOrderId) throw new BusinessRuleException('OutboundOrderId is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for allocation');
    return normalized;
  }

  private NormalizePolicy(value?: AllocationPolicy | string | null): AllocationPolicy {
    if (!value) return AllocationPolicy.PartialBackorder;
    if (value === AllocationPolicy.FullOnly || value === 'full-only' || value === 'FULL_ONLY') {
      return AllocationPolicy.FullOnly;
    }
    if (value === AllocationPolicy.PartialBackorder || value === 'partial-backorder' || value === 'PARTIAL_BACKORDER') {
      return AllocationPolicy.PartialBackorder;
    }
    throw new BusinessRuleException('Allocation policy is not supported in V1-19', { Policy: value });
  }

  private AllocationFingerprintPayload(request: NormalizedAllocateRequest) {
    const { IdempotencyKey: _idempotencyKey, ...payload } = request;
    void _idempotencyKey;
    return payload;
  }

  private AssertPageSize(pageSize?: number): void {
    if (pageSize !== undefined && Number(pageSize) > MAX_PAGE_SIZE) {
      throw new BusinessRuleException('PageSize must not be greater than 100');
    }
  }

  private NormalizeEvidence(evidenceRefs?: string[]): string[] {
    return (evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private Fingerprint(operation: string, payload: unknown): string {
    return createHash('sha256')
      .update(this.StableStringify({ Operation: operation, Payload: payload }))
      .digest('hex');
  }

  private StableStringify(value: unknown): string {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map((item) => this.StableStringify(item)).join(',')}]`;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.StableStringify(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
