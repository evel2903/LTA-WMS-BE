import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { PutawayTaskDto, ReleasePutawayTaskDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/PutawayTaskDtoMapper';
import {
  PutawayRuleAttributeKeys,
  PutawayRuleGate,
} from '@modules/InventoryExecution/Application/Services/PutawayRuleGate';
import { RuleGateDecision } from '@modules/WarehouseProfile/Application/Services/RuleGateEvaluator';
import {
  BuildPutawayTaskAudit,
  PutawayTaskToAuditJson,
} from '@modules/InventoryExecution/Application/UseCases/PutawayTaskAudit';
import { AssertPutawayTaskPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

const INVENTORY_READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';

interface EligibilityDecision {
  Target: LocationEntity;
  TargetProfile: LocationProfileEntity | null;
  Constraints: Record<string, unknown>;
  RuleCode: string | null;
  RuleSuggestion: { Message: string; RuleCode: string } | null;
}

export class ReleasePutawayTaskUseCase {
  constructor(
    private readonly putawayTasks: IPutawayTaskRepository,
    private readonly receiving: IReceivingRepository,
    private readonly locations: ILocationRepository,
    private readonly locationProfiles: ILocationProfileRepository,
    private readonly ruleGate: PutawayRuleGate,
    private readonly integrations: IIntegrationRepository,
    private readonly taskExecution: ITaskExecutionRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ReleasePutawayTaskDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<PutawayTaskDto> {
    this.AssertRequest(request);
    const release = await this.receiving.FindInboundPutawayReleaseById(request.InboundPutawayReleaseId);
    if (!release) throw new NotFoundException('Inbound putaway release not found');

    await AssertPutawayTaskPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, {
      WarehouseId: release.WarehouseId,
      OwnerId: release.OwnerId,
    });

    const duplicate = await this.putawayTasks.FindByIdempotencyKey(release.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, request);
      return PutawayTaskDtoMapper.ToDto(duplicate, true);
    }
    const existingForRelease = await this.putawayTasks.FindByInboundPutawayReleaseId(release.Id);
    if (existingForRelease) {
      throw new ConflictException('Putaway task already exists for inbound putaway release');
    }

    if (release.InventoryStatusCode !== INVENTORY_READY_FOR_PUTAWAY) {
      const reason = `Inventory status ${release.InventoryStatusCode} cannot create putaway task`;
      await this.AuditBlocked(context, release, reason, { InventoryStatusCode: release.InventoryStatusCode });
      throw new BusinessRuleException(reason);
    }

    const eligibility = await this.ResolveTarget(request, release, context);
    const now = new Date();
    const taskId = randomUUID();
    const outboxId = randomUUID();
    const mobileTaskId = randomUUID();
    const reasonCode = request.ReasonCode?.trim() || null;
    const reasonCodeId = reasonCode
      ? (
          await this.reasonCatalog.ValidateReason({
            ReasonCode: reasonCode,
            Action: ActionCode.Create,
            ObjectType: ObjectType.PutawayTask,
          })
        ).ReasonCodeId
      : null;
    const task = new PutawayTaskEntity({
      Id: taskId,
      TaskCode: this.BuildTaskCode(taskId),
      TaskStatus: PutawayTaskStatus.Released,
      InboundPutawayReleaseId: release.Id,
      ReceiptId: release.ReceiptId,
      ReceiptLineId: release.ReceiptLineId,
      InboundPlanId: release.InboundPlanId,
      InboundPlanLineId: release.InboundPlanLineId,
      InboundLpnId: release.InboundLpnId,
      OwnerId: release.OwnerId,
      OwnerCode: release.OwnerCode,
      WarehouseId: release.WarehouseId,
      WarehouseCode: release.WarehouseCode,
      SkuId: release.SkuId,
      SkuCode: release.SkuCode,
      UomId: release.UomId,
      UomCode: release.UomCode,
      Quantity: release.Quantity,
      LpnCode: release.LpnCode,
      SsccCode: release.SsccCode,
      InventoryStatusCode: release.InventoryStatusCode,
      SourceLocationId: request.SourceLocationId ?? release.CurrentLocationId,
      SourceLocationCode: request.SourceLocationCode?.trim() || release.CurrentLocationCode,
      TargetLocationId: eligibility.Target.Id,
      TargetLocationCode: eligibility.Target.LocationCode,
      TargetLocationProfileId: eligibility.Target.LocationProfileId,
      Priority: this.NormalizePriority(request.Priority),
      WorkPoolCode: request.WorkPoolCode?.trim() || null,
      AssignedUserId: request.AssignedUserId ?? null,
      ConstraintJson: {
        ...eligibility.Constraints,
        Source: {
          SourceLocationId: request.SourceLocationId ?? release.CurrentLocationId,
          SourceLocationCode: request.SourceLocationCode?.trim() || release.CurrentLocationCode,
        },
      },
      EligibilityDecisionJson: {
        Decision: 'Released',
        SelectedBy: request.TargetLocationId ? 'requested_target' : 'suggested_target',
        LocationProfileStatus: eligibility.TargetProfile?.Status ?? null,
        RuleCode: eligibility.RuleCode,
        RuleSuggestion: eligibility.RuleSuggestion,
      },
      OutboxMessageId: outboxId,
      MobileTaskId: mobileTaskId,
      ReasonCode: reasonCode,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      IdempotencyKey: request.IdempotencyKey,
      ReleasedAt: now,
      ReleasedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const mobileTask = this.BuildMobileTask(mobileTaskId, task, context.ActorUserId, now);
    const outbox = this.BuildOutbox(outboxId, task);

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.putawayTasks.Create(task, manager);
        await this.taskExecution.Save(mobileTask, manager);
        await this.integrations.CreateOutboxMessage(outbox, manager);
        return {
          result: PutawayTaskDtoMapper.ToDto(created),
          entry: BuildPutawayTaskAudit(context, created, {
            Action: ActionCode.Create,
            AfterJson: PutawayTaskToAuditJson(created),
            ReasonCodeId: created.ReasonCodeId,
            ReasonNote: created.ReasonNote,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.putawayTasks.FindByIdempotencyKey(release.Id, request.IdempotencyKey);
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, request);
          return PutawayTaskDtoMapper.ToDto(concurrentDuplicate, true);
        }
      }
      throw error;
    }
  }

  private AssertRequest(request: ReleasePutawayTaskDto): void {
    if (!request.InboundPutawayReleaseId?.trim())
      throw new BusinessRuleException('InboundPutawayReleaseId is required');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('Putaway task idempotency key is required');
  }

  private AssertDuplicateMatchesRequest(task: PutawayTaskEntity, request: ReleasePutawayTaskDto): void {
    if (request.TargetLocationId && task.TargetLocationId !== request.TargetLocationId) {
      throw new ConflictException('Putaway task idempotency key already used for a different target location');
    }
    if (request.SourceLocationId && task.SourceLocationId !== request.SourceLocationId) {
      throw new ConflictException('Putaway task idempotency key already used for a different source location');
    }
  }

  private async ResolveTarget(
    request: ReleasePutawayTaskDto,
    release: InboundPutawayReleaseEntity,
    context: AuditContext,
  ): Promise<EligibilityDecision> {
    if (request.TargetLocationId) {
      const target = await this.locations.FindById(request.TargetLocationId);
      if (!target) {
        await this.AuditBlocked(context, release, 'Target location not found', {
          TargetLocationId: request.TargetLocationId,
        });
        throw new BusinessRuleException('Target location not found');
      }
      try {
        return await this.AssertLocationEligible(target, release, 'requested_target');
      } catch (error) {
        await this.AuditBlocked(context, release, 'Target location is not eligible for putaway', {
          TargetLocationId: target.Id,
          TargetLocationCode: target.LocationCode,
          Reason: error instanceof Error ? error.message : 'Location rejected',
          Details: error instanceof BusinessRuleException ? error.Details : null,
        });
        throw error;
      }
    }

    const candidates = await this.locations.List(0, 100, {
      WarehouseId: release.WarehouseId,
      LocationStatus: LocationStatus.Active,
    });
    const sorted = [...candidates.Items].sort((left, right) => {
      const leftSequence = left.PutawaySequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.PutawaySequence ?? Number.MAX_SAFE_INTEGER;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
      return left.LocationCode.localeCompare(right.LocationCode);
    });
    const rejections: Record<string, unknown>[] = [];
    for (const candidate of sorted) {
      try {
        return await this.AssertLocationEligible(candidate, release, 'suggested_target');
      } catch (error) {
        rejections.push({
          LocationId: candidate.Id,
          LocationCode: candidate.LocationCode,
          Reason: error instanceof Error ? error.message : 'Location rejected',
        });
      }
    }
    await this.AuditBlocked(context, release, 'No eligible putaway target location found', { Rejections: rejections });
    throw new BusinessRuleException('No eligible putaway target location found', { Rejections: rejections });
  }

  private async AssertLocationEligible(
    location: LocationEntity,
    release: InboundPutawayReleaseEntity,
    selectedBy: string,
  ): Promise<EligibilityDecision> {
    const failures: string[] = [];
    if (location.WarehouseId !== release.WarehouseId) failures.push('TARGET_WAREHOUSE_MISMATCH');
    if (location.LocationStatus !== LocationStatus.Active) failures.push('TARGET_LOCATION_NOT_ACTIVE');
    if (location.OwnerRestriction && ![release.OwnerId, release.OwnerCode].includes(location.OwnerRestriction)) {
      failures.push('TARGET_OWNER_RESTRICTION_MISMATCH');
    }
    if (location.CapacityQty !== null && release.Quantity > location.CapacityQty) {
      failures.push('TARGET_CAPACITY_INSUFFICIENT');
    }

    const profile = await this.locationProfiles.FindById(location.LocationProfileId);
    if (!profile) failures.push('TARGET_LOCATION_PROFILE_NOT_FOUND');
    if (profile && profile.Status !== MasterDataStatus.Active) failures.push('TARGET_LOCATION_PROFILE_INACTIVE');
    if (
      profile &&
      (this.BoolPolicy(profile.OperationPolicy.putawayBlocked) ||
        this.BoolPolicy(profile.EligibilityPolicy.putawayBlocked))
    ) {
      failures.push('TARGET_PROFILE_BLOCKS_PUTAWAY');
    }
    if (profile && profile.OperationPolicy.putawayAllowed === false)
      failures.push('TARGET_PROFILE_PUTAWAY_NOT_ALLOWED');

    // Rule engine is consulted PER-CANDIDATE (each location has its own ZoneId/LocationType, so
    // context differs per candidate — not one call for the whole candidate set, R-PUT-ELIG-01+),
    // but only when the candidate hasn't already failed a structural check — a doomed candidate
    // throws either way, so skip the wasted resolver round-trip. Only a blocking/approval decision
    // is authoritative; a matched-but-non-blocking (AutoSuggestion) or empty decision does NOT
    // change eligibility or candidate selection order (ADR-5 — no loosening, same pattern applied
    // since IRE-02). A rule-driven failure is appended to the SAME `failures` array as structural
    // checks so it flows through the existing throw/Rejections[] accumulation unchanged.
    let decision: RuleGateDecision | null = null;
    if (failures.length === 0) {
      decision = await this.ruleGate.Decide({
        WarehouseId: release.WarehouseId,
        OwnerId: release.OwnerId,
        ZoneId: location.ZoneId,
        LocationType: location.LocationType,
        SkuId: release.SkuId,
        Attributes: {
          [PutawayRuleAttributeKeys.CapacityAvailable]:
            location.CapacityQty === null || release.Quantity <= location.CapacityQty,
        },
      });
      if (decision.Blocked) failures.push(`RULE_BLOCKED:${decision.RuleCode ?? 'unknown'}`);
      else if (decision.ApprovalRequired) failures.push(`RULE_APPROVAL_REQUIRED:${decision.RuleCode ?? 'unknown'}`);
    }

    if (failures.length > 0) {
      throw new BusinessRuleException('Target location is not eligible for putaway', {
        LocationId: location.Id,
        LocationCode: location.LocationCode,
        Failures: failures,
      });
    }

    return {
      Target: location,
      TargetProfile: profile,
      RuleCode: decision?.RuleCode ?? null,
      RuleSuggestion: decision?.Suggestion ?? null,
      Constraints: {
        SelectedBy: selectedBy,
        LocationId: location.Id,
        LocationCode: location.LocationCode,
        LocationStatus: location.LocationStatus,
        LocationProfileId: location.LocationProfileId,
        CapacityQty: location.CapacityQty,
        OwnerRestriction: location.OwnerRestriction,
        MixSkuPolicy: location.MixSkuPolicy,
        MixLotPolicy: location.MixLotPolicy,
        MixOwnerPolicy: location.MixOwnerPolicy,
        PutawaySequence: location.PutawaySequence,
      },
    };
  }

  private NormalizePriority(value?: number): number {
    if (!Number.isFinite(value)) return 50;
    return Math.min(999, Math.max(1, Math.floor(value as number)));
  }

  private BoolPolicy(value: unknown): boolean {
    return value === true || String(value).toLowerCase() === 'true';
  }

  private BuildTaskCode(taskId: string): string {
    return `PUT-${taskId.slice(0, 8).toUpperCase()}`;
  }

  private BuildMobileTask(
    mobileTaskId: string,
    task: PutawayTaskEntity,
    actorUserId: string | null,
    now: Date,
  ): MobileTaskEntity {
    return new MobileTaskEntity({
      Id: mobileTaskId,
      TaskCode: `MT-${task.TaskCode}`,
      TaskType: MobileTaskType.Putaway,
      TaskStatus: MobileTaskStatus.Released,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      SourceDocumentType: 'PutawayTask',
      SourceDocumentId: task.Id,
      SourceDocumentCode: task.TaskCode,
      Priority: task.Priority,
      AssignedUserId: task.AssignedUserId,
      ReleasedAt: now,
      TaskPayload: {
        PutawayTaskId: task.Id,
        InboundPutawayReleaseId: task.InboundPutawayReleaseId,
        LpnCode: task.LpnCode,
        SsccCode: task.SsccCode,
        SkuCode: task.SkuCode,
        UomCode: task.UomCode,
        Quantity: task.Quantity,
        InventoryStatusCode: task.InventoryStatusCode,
        SourceLocationCode: task.SourceLocationCode,
        TargetLocationCode: task.TargetLocationCode,
      },
      CreatedAt: now,
      CreatedBy: actorUserId,
      UpdatedAt: now,
      UpdatedBy: actorUserId,
    });
  }

  private BuildOutbox(outboxId: string, task: PutawayTaskEntity): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `PutawayTaskReleased:${task.InboundPutawayReleaseId}:${task.IdempotencyKey}`,
      EventType: 'PutawayTaskReleased',
      Version: '1.0',
      BusinessReference: task.TaskCode,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: task.WarehouseCode ?? task.WarehouseId,
      OwnerContext: task.OwnerCode ?? task.OwnerId,
      EventTime: task.ReleasedAt,
      CorrelationId: task.ReceiptId,
      CausationId: task.InboundPutawayReleaseId,
      Payload: PutawayTaskToAuditJson(task),
      Status: OutboxMessageStatus.Pending,
      CreatedBy: task.ReleasedBy,
    });
  }

  private async AuditBlocked(
    context: AuditContext,
    release: InboundPutawayReleaseEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const task = new PutawayTaskEntity({
      TaskCode: 'PUTAWAY-BLOCKED',
      TaskStatus: PutawayTaskStatus.Exception,
      InboundPutawayReleaseId: release.Id,
      ReceiptId: release.ReceiptId,
      ReceiptLineId: release.ReceiptLineId,
      InboundPlanId: release.InboundPlanId,
      InboundPlanLineId: release.InboundPlanLineId,
      InboundLpnId: release.InboundLpnId,
      OwnerId: release.OwnerId,
      OwnerCode: release.OwnerCode,
      WarehouseId: release.WarehouseId,
      WarehouseCode: release.WarehouseCode,
      SkuId: release.SkuId,
      SkuCode: release.SkuCode,
      UomId: release.UomId,
      UomCode: release.UomCode,
      Quantity: release.Quantity,
      LpnCode: release.LpnCode,
      SsccCode: release.SsccCode,
      InventoryStatusCode: release.InventoryStatusCode,
      TargetLocationId: 'not-created',
      TargetLocationCode: 'not-created',
      Priority: 50,
      ConstraintJson: details,
      IdempotencyKey: `blocked:${release.Id}`,
      ReleasedAt: new Date(),
    });
    await this.audited.Run(async () => ({
      result: undefined,
      entry: BuildPutawayTaskAudit(context, task, {
        Result: AuditResult.Failed,
        AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
      }),
    }));
  }
}
