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
import {
  ListPickReleasesDto,
  PickReleaseDto,
  ReleaseOutboundOrderDto,
} from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import {
  AllocationAggregate,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { PickReleaseDtoMapper } from '@modules/Outbound/Application/Mappers/PickReleaseDtoMapper';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface NormalizedReleaseRequest extends ReleaseOutboundOrderDto {
  ReleaseMode: PickReleaseMode;
  BatchSize: number;
  ReasonCode: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface ReleasePlan {
  Status: PickReleaseStatus;
  BlockReason: string | null;
  Tasks: PickTaskEntity[];
  TotalReleasedQuantity: number;
  EvidenceRefs: string[];
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_BATCH_SIZE = 50;

class PickReleaseNoopResult extends Error {
  constructor(public readonly Aggregate: PickReleaseAggregate) {
    super('Pick release action is idempotent/no-op');
  }
}

export class PickReleaseLifecycleService {
  constructor(
    private readonly releases: IPickReleaseRepository,
    private readonly allocations: IAllocationRepository,
    private readonly outboundOrders: IOutboundOrderRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Release(request: ReleaseOutboundOrderDto, context: AuditContext): Promise<PickReleaseDto> {
    const normalized = this.NormalizeReleaseRequest(request);
    const aggregate = await this.outboundOrders.FindById(normalized.OutboundOrderId);
    if (!aggregate) throw new NotFoundException('Outbound order not found');
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, ObjectType.OutboundOrder, aggregate.Order);
    await this.AssertPermission(context.ActorUserId, ActionCode.Create, ObjectType.PickTask, aggregate.Order);

    const fingerprint = this.Fingerprint('ReleaseOutboundOrder', this.ReleaseFingerprintPayload(normalized));
    const duplicate = await this.releases.FindByIdempotencyKey(normalized.IdempotencyKey);
    if (duplicate) return this.ReturnDuplicate(duplicate, normalized.OutboundOrderId, fingerprint);

    try {
      return await this.audited.Run(async (manager) => {
        const current = await this.outboundOrders.FindByIdForUpdate(normalized.OutboundOrderId, manager);
        if (!current) throw new NotFoundException('Outbound order not found');
        await this.AssertPermission(context.ActorUserId, ActionCode.Update, ObjectType.OutboundOrder, current.Order);
        await this.AssertPermission(context.ActorUserId, ActionCode.Create, ObjectType.PickTask, current.Order);
        this.AssertOrderCanRelease(current.Order.DocumentStatus);

        const duplicateInTx = await this.releases.FindByIdempotencyKey(normalized.IdempotencyKey, manager);
        if (duplicateInTx) throw new PickReleaseNoopResult(duplicateInTx);
        const activeRelease = await this.releases.FindActiveByOutboundOrderId(current.Order.Id, manager);
        if (activeRelease) {
          throw new ConflictException('Outbound order already has an active pick release', {
            OutboundOrderId: current.Order.Id,
            PickReleaseId: activeRelease.Release.Id,
            PickReleaseStatus: activeRelease.Release.Status,
          });
        }

        const allocation = await this.allocations.FindActiveByOutboundOrderId(current.Order.Id, manager);
        this.AssertAllocationCanRelease(allocation, current);
        const lateReason = await this.ResolveLateCutoffReasonIfNeeded(current, normalized);
        const now = new Date();
        const releaseId = randomUUID();
        const releaseNumber = `REL-${now.getTime()}-${releaseId.slice(0, 6).toUpperCase()}`;
        const outboxId = randomUUID();
        const plan = this.BuildPlan(
          releaseId,
          releaseNumber,
          current,
          allocation as AllocationAggregate,
          normalized,
          now,
        );
        const evidenceRefs = lateReason?.EvidenceRefs ?? plan.EvidenceRefs;
        const release = new PickReleaseEntity({
          Id: releaseId,
          ReleaseNumber: releaseNumber,
          OutboundOrderId: current.Order.Id,
          AllocationId: (allocation as AllocationAggregate).Allocation.Id,
          WarehouseId: current.Order.WarehouseId,
          WarehouseCode: current.Order.WarehouseCode,
          OwnerId: current.Order.OwnerId,
          OwnerCode: current.Order.OwnerCode,
          ReleaseMode: normalized.ReleaseMode,
          BatchSize: normalized.BatchSize,
          Status: plan.Status,
          BlockReason: plan.BlockReason,
          TotalTaskCount: plan.Tasks.length,
          TotalReleasedQuantity: plan.TotalReleasedQuantity,
          OutboxMessageId: outboxId,
          IdempotencyKey: normalized.IdempotencyKey,
          PayloadFingerprint: fingerprint,
          ReasonCode: lateReason?.ReasonCode ?? null,
          ReasonCodeId: lateReason?.ReasonCodeId ?? null,
          ReasonNote: lateReason?.ReasonNote ?? null,
          EvidenceRefs: evidenceRefs,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: context.ActorUserId,
          UpdatedBy: context.ActorUserId,
        });

        const saved = await this.releases.Create(release, plan.Tasks, manager);
        await this.WriteOutbox(outboxId, current, saved, context.ActorUserId, manager);
        if (current.Order.CoreFlowInstanceId) {
          await this.coreFlows.CreateMilestone(
            this.BuildMilestone(current.Order.CoreFlowInstanceId, saved, context.ActorUserId),
            manager,
          );
        }
        const dto = PickReleaseDtoMapper.ToDto(saved);
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.PickTask,
            ObjectId: saved.Release.Id,
            ObjectCode: saved.Release.ReleaseNumber,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: lateReason?.ReasonCodeId ?? null,
            ReasonNote: lateReason?.ReasonNote ?? null,
            EvidenceRefs: evidenceRefs,
            ReferenceType: 'OutboundPickRelease',
            ReferenceId: current.Order.Id,
            WarehouseId: current.Order.WarehouseId,
            OwnerId: current.Order.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof PickReleaseNoopResult) {
        return this.ReturnDuplicate(error.Aggregate, normalized.OutboundOrderId, fingerprint);
      }
      if (error instanceof ConflictException) {
        const duplicateAfterConflict = await this.releases.FindByIdempotencyKey(normalized.IdempotencyKey);
        if (duplicateAfterConflict) {
          return this.ReturnDuplicate(duplicateAfterConflict, normalized.OutboundOrderId, fingerprint);
        }
      }
      throw error;
    }
  }

  public async List(query: ListPickReleasesDto, actorUserId?: string | null) {
    this.AssertPageSize(query.PageSize);
    const order = await this.outboundOrders.FindById(query.OutboundOrderId);
    if (!order) throw new NotFoundException('Outbound order not found');
    await this.AssertPermission(actorUserId, ActionCode.Read, ObjectType.PickTask, order.Order);
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: DEFAULT_PAGE_SIZE, MaxPageSize: MAX_PAGE_SIZE },
    );
    const releases = await this.releases.ListCandidates(query);
    return ToPagedResult(
      releases.slice(paging.Skip, paging.Skip + paging.Take).map((item) => PickReleaseDtoMapper.ToDto(item)),
      releases.length,
      paging.Page,
      paging.PageSize,
    );
  }

  public async Get(id: string, actorUserId?: string | null): Promise<PickReleaseDto> {
    const aggregate = await this.releases.FindById(id);
    if (!aggregate) throw new NotFoundException('Pick release not found');
    await this.AssertPermission(actorUserId, ActionCode.Read, ObjectType.PickTask, aggregate.Release);
    return PickReleaseDtoMapper.ToDto(aggregate);
  }

  private BuildPlan(
    releaseId: string,
    releaseNumber: string,
    orderAggregate: OutboundOrderAggregate,
    allocationAggregate: AllocationAggregate,
    request: NormalizedReleaseRequest,
    now: Date,
  ): ReleasePlan {
    const invalidLine = allocationAggregate.Lines.find(
      (line) =>
        line.AllocatedQuantity > 0 && (!line.SourceBalanceId || !line.SourceDimensionId || !line.SourceLocationId),
    );
    if (invalidLine) {
      return {
        Status: PickReleaseStatus.Blocked,
        BlockReason: 'Allocated line is missing source balance, dimension, or location',
        Tasks: [],
        TotalReleasedQuantity: 0,
        EvidenceRefs: [`pick-release:block:missing-source:${invalidLine.Id}`],
      };
    }

    const eligibleLines = allocationAggregate.Lines.filter((line) => line.AllocatedQuantity > 0).sort(
      this.SortReleaseLines,
    );
    if (eligibleLines.length === 0) {
      return {
        Status: PickReleaseStatus.Blocked,
        BlockReason: 'Allocation has no allocated lines eligible for pick task release',
        Tasks: [],
        TotalReleasedQuantity: 0,
        EvidenceRefs: [`pick-release:block:no-eligible-lines:${allocationAggregate.Allocation.Id}`],
      };
    }
    const tasks = eligibleLines.map((line, index) =>
      this.BuildTask(releaseId, releaseNumber, orderAggregate, allocationAggregate, line, request, index + 1, now),
    );
    return {
      Status: PickReleaseStatus.Released,
      BlockReason: null,
      Tasks: tasks,
      TotalReleasedQuantity: tasks.reduce((sum, task) => sum + task.Quantity, 0),
      EvidenceRefs: [],
    };
  }

  private BuildTask(
    releaseId: string,
    releaseNumber: string,
    orderAggregate: OutboundOrderAggregate,
    allocationAggregate: AllocationAggregate,
    line: AllocationLineEntity,
    request: NormalizedReleaseRequest,
    sequence: number,
    now: Date,
  ): PickTaskEntity {
    const batchNumber =
      request.ReleaseMode === PickReleaseMode.Batch
        ? `${releaseNumber}-B${Math.ceil(sequence / request.BatchSize)}`
        : null;
    return new PickTaskEntity({
      Id: randomUUID(),
      PickReleaseId: releaseId,
      OutboundOrderId: orderAggregate.Order.Id,
      AllocationId: allocationAggregate.Allocation.Id,
      AllocationLineId: line.Id,
      OutboundOrderLineId: line.OutboundOrderLineId,
      TaskNumber: `PT-${now.getTime()}-${String(sequence).padStart(3, '0')}`,
      Status: PickTaskStatus.Released,
      Sequence: sequence,
      BatchNumber: batchNumber,
      SourceBalanceId: line.SourceBalanceId as string,
      SourceDimensionId: line.SourceDimensionId as string,
      SourceLocationId: line.SourceLocationId as string,
      TargetReference: orderAggregate.Order.ShipToReference
        ? `SHIP_TO:${orderAggregate.Order.ShipToReference}`
        : `OUTBOUND:${orderAggregate.Order.BusinessReference}`,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      Quantity: line.AllocatedQuantity,
      InventoryStatusCode: line.InventoryStatusCode,
      LotNumber: line.LotNumber,
      SerialNumber: line.SerialNumber,
      ExpiryDate: line.ExpiryDate,
      CreatedAt: now,
    });
  }

  private async ResolveLateCutoffReasonIfNeeded(
    orderAggregate: OutboundOrderAggregate,
    request: NormalizedReleaseRequest,
  ): Promise<ReasonDecision | null> {
    const cutoff = orderAggregate.Order.CutoffAt;
    if (!cutoff || cutoff.getTime() >= Date.now()) return null;
    if (!request.ReasonCode) {
      throw new BusinessRuleException('ReasonCode is required when releasing after cutoff');
    }
    if (request.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required when releasing after cutoff', {
        ReasonCode: request.ReasonCode,
      });
    }
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Create,
      ObjectType: ObjectType.PickTask,
    });
    if (reason.EvidenceRequired && request.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required when releasing after cutoff', {
        ReasonCode: request.ReasonCode,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required release reason is not directly supported by V1-20', {
        ReasonCode: request.ReasonCode,
      });
    }
    return {
      ReasonCode: request.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs,
    };
  }

  private async WriteOutbox(
    firstOutboxId: string,
    orderAggregate: OutboundOrderAggregate,
    releaseAggregate: PickReleaseAggregate,
    actorUserId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const eventType =
      releaseAggregate.Release.Status === PickReleaseStatus.Blocked
        ? 'OrderReleaseBlocked'
        : 'OrderReleasedToWarehouse';
    await this.integrations.CreateOutboxMessage(
      this.BuildOutbox(firstOutboxId, orderAggregate, releaseAggregate, eventType, actorUserId),
      manager,
    );
    if (releaseAggregate.Release.ReleaseMode === PickReleaseMode.Batch && releaseAggregate.Tasks.length > 0) {
      await this.integrations.CreateOutboxMessage(
        this.BuildOutbox(randomUUID(), orderAggregate, releaseAggregate, 'WaveReleased', actorUserId),
        manager,
      );
    }
    for (const task of releaseAggregate.Tasks) {
      await this.integrations.CreateOutboxMessage(
        this.BuildOutbox(randomUUID(), orderAggregate, releaseAggregate, 'PickTaskReleased', actorUserId, task.Id),
        manager,
      );
    }
  }

  private BuildOutbox(
    id: string,
    orderAggregate: OutboundOrderAggregate,
    releaseAggregate: PickReleaseAggregate,
    eventType: string,
    actorUserId: string | null,
    taskId?: string,
  ): OutboxMessageEntity {
    const release = releaseAggregate.Release;
    return new OutboxMessageEntity({
      Id: id,
      MessageId: taskId ? `${eventType}:${release.Id}:${taskId}` : `${eventType}:${release.Id}`,
      EventType: eventType,
      Version: '1.0',
      BusinessReference: release.ReleaseNumber,
      SourceSystem: 'LTA-WMS',
      TargetSystem: orderAggregate.Order.SourceSystem,
      WarehouseContext: release.WarehouseCode ?? release.WarehouseId,
      OwnerContext: release.OwnerCode ?? release.OwnerId,
      EventTime: release.UpdatedAt,
      CorrelationId: orderAggregate.Order.CoreFlowInstanceId,
      CausationId: release.Id,
      Payload: {
        OutboundOrderId: release.OutboundOrderId,
        AllocationId: release.AllocationId,
        PickReleaseId: release.Id,
        ReleaseNumber: release.ReleaseNumber,
        ReleaseMode: release.ReleaseMode,
        ReleaseStatus: release.Status,
        BlockReason: release.BlockReason,
        ReasonCode: release.ReasonCode,
        ReasonCodeId: release.ReasonCodeId,
        ReasonNote: release.ReasonNote,
        EvidenceRefs: release.EvidenceRefs,
        TotalTaskCount: release.TotalTaskCount,
        TotalReleasedQuantity: release.TotalReleasedQuantity,
        TaskId: taskId ?? null,
        Tasks: releaseAggregate.Tasks.map((task) => ({
          PickTaskId: task.Id,
          TaskNumber: task.TaskNumber,
          Sequence: task.Sequence,
          BatchNumber: task.BatchNumber,
          AllocationLineId: task.AllocationLineId,
          OutboundOrderLineId: task.OutboundOrderLineId,
          SourceBalanceId: task.SourceBalanceId,
          SourceDimensionId: task.SourceDimensionId,
          SourceLocationId: task.SourceLocationId,
          SkuId: task.SkuId,
          UomId: task.UomId,
          Quantity: task.Quantity,
          LotNumber: task.LotNumber,
          SerialNumber: task.SerialNumber,
          ExpiryDate: task.ExpiryDate,
          Status: task.Status,
        })),
      },
      Status: OutboxMessageStatus.Pending,
      CreatedAt: release.UpdatedAt,
      CreatedBy: actorUserId,
    });
  }

  private BuildMilestone(
    coreFlowInstanceId: string,
    releaseAggregate: PickReleaseAggregate,
    actorUserId: string | null,
  ): WorkflowMilestoneEntity {
    const release = releaseAggregate.Release;
    return new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: coreFlowInstanceId,
      StageCode: CoreFlowStageCode.Outbound,
      StepCode: CoreFlowStepCode.ReleasedToWarehouse,
      MilestoneStatus:
        release.Status === PickReleaseStatus.Blocked
          ? WorkflowMilestoneStatus.Blocked
          : WorkflowMilestoneStatus.Completed,
      Metadata: {
        PickReleaseId: release.Id,
        ReleaseStatus: release.Status,
        ReleaseMode: release.ReleaseMode,
        TotalTaskCount: release.TotalTaskCount,
        TotalReleasedQuantity: release.TotalReleasedQuantity,
        BlockReason: release.BlockReason,
      },
      OccurredAt: release.UpdatedAt,
      CreatedBy: actorUserId,
    });
  }

  private AssertAllocationCanRelease(
    allocation: AllocationAggregate | null,
    orderAggregate: OutboundOrderAggregate,
  ): asserts allocation is AllocationAggregate {
    const outboundOrderId = orderAggregate.Order.Id;
    if (!allocation) {
      throw new BusinessRuleException('Outbound order must have an active allocation before release', {
        OutboundOrderId: outboundOrderId,
      });
    }
    if (allocation.Allocation.OutboundOrderId !== outboundOrderId) {
      throw new ConflictException('Allocation does not belong to outbound order');
    }
    if (
      allocation.Allocation.WarehouseId !== orderAggregate.Order.WarehouseId ||
      allocation.Allocation.OwnerId !== orderAggregate.Order.OwnerId
    ) {
      throw new ConflictException('Allocation scope does not match outbound order scope', {
        OutboundOrderId: outboundOrderId,
        AllocationId: allocation.Allocation.Id,
        OrderWarehouseId: orderAggregate.Order.WarehouseId,
        AllocationWarehouseId: allocation.Allocation.WarehouseId,
        OrderOwnerId: orderAggregate.Order.OwnerId,
        AllocationOwnerId: allocation.Allocation.OwnerId,
      });
    }
    if (
      allocation.Allocation.Status !== AllocationStatus.Allocated &&
      allocation.Allocation.Status !== AllocationStatus.PartiallyAllocated
    ) {
      throw new BusinessRuleException('Only allocated or partially allocated demand can be released', {
        AllocationStatus: allocation.Allocation.Status,
      });
    }
    if (allocation.Allocation.TotalAllocatedQuantity <= 0) {
      throw new BusinessRuleException('Outbound order has no allocated quantity to release');
    }
  }

  private AssertOrderCanRelease(status: OutboundOrderStatus): void {
    if (status !== OutboundOrderStatus.Validated) {
      throw new BusinessRuleException('Only validated outbound orders can be released to warehouse', {
        DocumentStatus: status,
      });
    }
  }

  private async AssertPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    objectType: ObjectType,
    scope: { WarehouseId?: string | null; OwnerId?: string | null },
  ): Promise<void> {
    if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: objectType,
      Scope: { WarehouseId: scope.WarehouseId ?? null, OwnerId: scope.OwnerId ?? null },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException('Permission denied for pick release action', {
        Action: action,
        ObjectType: objectType,
        Reason: decision.Reason ?? 'PERMISSION_DENIED',
      });
    }
  }

  private NormalizeReleaseRequest(request: ReleaseOutboundOrderDto): NormalizedReleaseRequest {
    const normalized: NormalizedReleaseRequest = {
      OutboundOrderId: request.OutboundOrderId?.trim() ?? '',
      ReleaseMode: this.NormalizeReleaseMode(request.ReleaseMode),
      BatchSize: this.NormalizeBatchSize(request.BatchSize),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.OutboundOrderId) throw new BusinessRuleException('OutboundOrderId is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for pick release');
    return normalized;
  }

  private NormalizeReleaseMode(value?: PickReleaseMode | string | null): PickReleaseMode {
    if (!value) return PickReleaseMode.Discrete;
    if (value === PickReleaseMode.Discrete || value === 'discrete') return PickReleaseMode.Discrete;
    if (value === PickReleaseMode.Batch || value === 'batch') return PickReleaseMode.Batch;
    throw new BusinessRuleException('Pick release mode is not supported in V1-20', { ReleaseMode: value });
  }

  private NormalizeBatchSize(value?: number | null): number {
    if (value === undefined || value === null) return DEFAULT_BATCH_SIZE;
    const size = Number(value);
    if (!Number.isInteger(size) || size < 1) throw new BusinessRuleException('BatchSize must be a positive integer');
    if (size > MAX_PAGE_SIZE) throw new BusinessRuleException('BatchSize must not be greater than 100');
    return size;
  }

  private ReleaseFingerprintPayload(request: NormalizedReleaseRequest) {
    const { IdempotencyKey: _idempotencyKey, ...payload } = request;
    void _idempotencyKey;
    return payload;
  }

  private ReturnDuplicate(
    aggregate: PickReleaseAggregate,
    outboundOrderId: string,
    expectedFingerprint: string,
  ): PickReleaseDto {
    if (
      aggregate.Release.OutboundOrderId !== outboundOrderId ||
      aggregate.Release.PayloadFingerprint !== expectedFingerprint
    ) {
      throw new ConflictException('Pick release idempotency key reused with different payload', {
        PickReleaseId: aggregate.Release.Id,
        OutboundOrderId: aggregate.Release.OutboundOrderId,
      });
    }
    return PickReleaseDtoMapper.ToDto(aggregate, true);
  }

  private SortReleaseLines(left: AllocationLineEntity, right: AllocationLineEntity): number {
    const location = (left.SourceLocationId ?? '').localeCompare(right.SourceLocationId ?? '');
    if (location !== 0) return location;
    if (left.LineNumber !== right.LineNumber) return left.LineNumber - right.LineNumber;
    return left.Id.localeCompare(right.Id);
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
