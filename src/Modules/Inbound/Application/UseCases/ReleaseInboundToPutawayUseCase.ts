import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { InboundPutawayReleaseDto, ReleaseInboundToPutawayDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { InboundRuleAttributeKeys, InboundRuleGate } from '@modules/Inbound/Application/Services/InboundRuleGate';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { LabelBlockingValidationResultDto } from '@modules/BarcodeLabel/Application/DTOs/LabelBlockingValidationDto';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { DEFAULT_STAGING_LOCATION_CODE } from '@modules/MasterData/Domain/Constants/LocationConstants';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';

const INVENTORY_READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';
const BLOCKED_RELEASE_STATUSES = new Set(['PENDING_QC', 'HOLD', 'QUARANTINE', 'REJECTED', 'DAMAGED']);

interface ReleaseReadiness {
  Allowed: boolean;
  InventoryStatusCode: string;
  Quantity: number;
  Reason: string;
  SourceType: 'QcTask' | 'QcResult' | 'MissingQc';
  SourceId: string | null;
}

export class ReleaseInboundToPutawayUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly ruleGate: InboundRuleGate,
    private readonly labelBlocking: ValidateLabelBlockingUseCase,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly skus: ISkuRepository,
    private readonly locations: ILocationRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ReleaseInboundToPutawayDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPutawayReleaseDto> {
    this.AssertRequest(request);
    const receipt = await this.receiving.FindReceiptById(request.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found');
    const line = await this.receiving.FindReceiptLineById(request.ReceiptLineId);
    if (!line || line.ReceiptId !== receipt.Id) throw new BusinessRuleException('Receipt line not found for release');

    const duplicate = await this.receiving.FindInboundPutawayReleaseByIdempotencyKey(line.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, request);
      return ReceivingDtoMapper.ToInboundPutawayReleaseDto(duplicate, true);
    }

    await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, receipt);

    const aggregate = await this.inboundPlans.FindById(receipt.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for release');
    const profile = aggregate.Plan.WarehouseProfileId
      ? await this.profiles.FindById(aggregate.Plan.WarehouseProfileId)
      : null;
    if (aggregate.Plan.WarehouseProfileId && !profile)
      throw new BusinessRuleException('WarehouseProfile not found for release');

    // IDC-02: SKU.LpnControlled is a SEPARATE source from the profile-level lpnControlled key the
    // rule gate/ProfileRequiresLpn read below -- OR-combined into lpnRequired, never replacing
    // either. Fail-closed on an unresolvable SkuId (same IRE-06 lesson as the compliance path in
    // ReleasePutawayTaskUseCase): an orphaned SkuId must not silently read as "no requirement".
    // lpn/sku are independent reads -- fetched in parallel, same pattern as the duplicate-check +
    // SKU lookup in ReleasePutawayTaskUseCase.ts.
    const [lpn, sku] = await Promise.all([
      this.receiving.FindInboundLpnByReceiptLineId(line.Id),
      this.skus.FindById(line.SkuId),
    ]);
    if (!sku) throw new BusinessRuleException('SKU not found for release', { SkuId: line.SkuId });
    const skuRequiresLpn = sku.LpnControlled === true;
    const profileRequiresLpn = this.ProfileRequiresLpn(profile);
    // Rule engine reads its OWN policy key (`lpnControlled`), independent of the legacy
    // `inboundLpnRequired`/`lpnRequired` keys `ProfileRequiresLpn` reads — otherwise the rule could
    // never fire on a case the fallback doesn't already cover, making the migration a no-op. Only a
    // blocking/approval decision is authoritative; a matched-but-non-blocking or empty decision falls
    // through to the previous profile key-check (ADR-5 — no loosening, same pattern since IRE-02). No
    // profile means no scope to gate on, so skip the rule call entirely (IRE-02's null-profile
    // divergence lesson). request.RequireLpn already forces the outcome on its own (and wins
    // RequiredBy priority below), so skip the rule call in that case too — wasted work otherwise.
    // SkuId is the received line's SKU — matches decision point #5's convention (IRE-07).
    let ruleLpnRequired = false;
    let ruleCode: string | null = null;
    if (profile && request.RequireLpn !== true) {
      const decision = await this.ruleGate.Decide({
        WarehouseId: receipt.WarehouseId,
        OwnerId: receipt.OwnerId,
        SkuId: line.SkuId,
        Attributes: {
          [InboundRuleAttributeKeys.LpnControlled]: this.BoolPolicy(profile.StrategyPolicy.lpnControlled),
          [InboundRuleAttributeKeys.HasLpn]: lpn !== null,
        },
      });
      ruleLpnRequired = decision.Blocked || decision.ApprovalRequired;
      // IRE-09: surface which rule fired on the persisted release record for audit/investigation.
      ruleCode = decision.RuleCode;
    }
    const lpnRequired = request.RequireLpn === true || ruleLpnRequired || profileRequiresLpn || skuRequiresLpn;
    if (lpnRequired && !lpn) {
      await this.AuditBlocked(context, receipt, line, 'LPN/SSCC is required before release to putaway', {
        RequiredBy:
          request.RequireLpn === true
            ? 'Request'
            : ruleLpnRequired
              ? 'Rule'
              : profileRequiresLpn
                ? 'WarehouseProfile'
                : 'Sku',
      });
      throw new BusinessRuleException('LPN/SSCC is required before release to putaway');
    }

    const readiness = await this.ResolveReadiness(line);
    if (!readiness.Allowed) {
      await this.AuditBlocked(context, receipt, line, readiness.Reason, {
        InventoryStatusCode: readiness.InventoryStatusCode,
        ReadinessSourceType: readiness.SourceType,
        ReadinessSourceId: readiness.SourceId,
      });
      throw new BusinessRuleException(readiness.Reason);
    }

    const labelDecision = await this.ValidateLabelReadiness(request, context, receipt, line, profile);
    if (labelDecision?.Blocked) {
      await this.AuditBlocked(context, receipt, line, labelDecision.Reason, {
        LabelDecision: labelDecision.Decision,
        RequiredLabelType: labelDecision.RequiredLabelType,
      });
      throw new BusinessRuleException(labelDecision.Reason);
    }

    const currentLocation = await this.ResolveCurrentLocation(request, receipt);

    const now = new Date();
    const outboxId = randomUUID();
    const milestoneId = receipt.CoreFlowInstanceId ? randomUUID() : null;
    const reasonCodeId = request.ReasonCode?.trim()
      ? (
          await this.reasonCatalog.ValidateReason({
            ReasonCode: request.ReasonCode.trim(),
            Action: ActionCode.Update,
            ObjectType: ObjectType.Receipt,
          })
        ).ReasonCodeId
      : null;
    const release = new InboundPutawayReleaseEntity({
      Id: randomUUID(),
      InboundLpnId: lpn?.Id ?? null,
      ReceiptId: receipt.Id,
      ReceiptLineId: line.Id,
      InboundPlanId: receipt.InboundPlanId,
      InboundPlanLineId: line.InboundPlanLineId,
      OwnerId: receipt.OwnerId,
      OwnerCode: receipt.OwnerCode,
      WarehouseId: receipt.WarehouseId,
      WarehouseCode: receipt.WarehouseCode,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      Quantity: readiness.Quantity,
      LpnCode: lpn?.LpnCode ?? null,
      SsccCode: lpn?.SsccCode ?? null,
      LotNumber: line.LotNumber,
      ExpiryDate: line.ExpiryDate,
      SerialNumber: line.SerialNumber,
      InventoryStatusCode: readiness.InventoryStatusCode,
      CurrentLocationId: currentLocation.Id,
      CurrentLocationCode: currentLocation.Code,
      WarehouseProfileId: aggregate.Plan.WarehouseProfileId,
      LabelDecision: labelDecision?.Decision ?? null,
      LabelReason: labelDecision?.Reason ?? null,
      MatchedPrintJobId: labelDecision?.MatchedPrintJobId ?? null,
      ConstraintJson: {
        ReadinessSourceType: readiness.SourceType,
        ReadinessSourceId: readiness.SourceId,
      },
      RuleCode: ruleCode,
      OutboxMessageId: outboxId,
      CoreFlowMilestoneId: milestoneId,
      ReasonCode: request.ReasonCode?.trim() || null,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      IdempotencyKey: request.IdempotencyKey,
      ReleasedAt: now,
      ReleasedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const outbox = this.BuildOutbox(outboxId, aggregate.Plan.BusinessReference, release);
    const milestone = milestoneId
      ? new WorkflowMilestoneEntity({
          Id: milestoneId,
          CoreFlowInstanceId: receipt.CoreFlowInstanceId as string,
          StageCode: CoreFlowStageCode.Inbound,
          StepCode: CoreFlowStepCode.InboundReleasedToPutaway,
          MilestoneStatus: WorkflowMilestoneStatus.Completed,
          Metadata: {
            ReceiptId: receipt.Id,
            ReceiptLineId: line.Id,
            InboundLpnId: lpn?.Id ?? null,
            LpnCode: lpn?.LpnCode ?? null,
            InventoryStatusCode: release.InventoryStatusCode,
            Quantity: release.Quantity,
          },
          OccurredAt: now,
          CreatedBy: context.ActorUserId,
        })
      : null;

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.receiving.CreateInboundPutawayRelease(release, manager);
        await this.integrations.CreateOutboxMessage(outbox, manager);
        if (milestone) await this.coreFlows.CreateMilestone(milestone, manager);
        const result = ReceivingDtoMapper.ToInboundPutawayReleaseDto(created);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.Receipt,
            ObjectId: receipt.Id,
            ObjectCode: receipt.ReceiptNumber,
            AfterJson: result as unknown as Record<string, unknown>,
            ReasonCodeId: created.ReasonCodeId,
            ReasonNote: created.ReasonNote,
            EvidenceRefs: created.EvidenceRefs.length ? created.EvidenceRefs : null,
            ReferenceType: 'InboundPutawayRelease',
            ReferenceId: created.Id,
            WarehouseId: receipt.WarehouseId,
            OwnerId: receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.receiving.FindInboundPutawayReleaseByIdempotencyKey(
          line.Id,
          request.IdempotencyKey,
        );
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, request);
          return ReceivingDtoMapper.ToInboundPutawayReleaseDto(concurrentDuplicate, true);
        }
      }
      throw error;
    }
  }

  private AssertRequest(request: ReleaseInboundToPutawayDto): void {
    if (!request.ReceiptId?.trim()) throw new BusinessRuleException('Receipt is required for putaway release');
    if (!request.ReceiptLineId?.trim()) throw new BusinessRuleException('Receipt line is required for putaway release');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('Putaway release idempotency key is required');
  }

  private AssertDuplicateMatchesRequest(
    duplicate: InboundPutawayReleaseEntity,
    request: ReleaseInboundToPutawayDto,
  ): void {
    // Only compare when the caller explicitly supplied a value -- the resolved default (looked up
    // from CurrentLocationCode via ResolveCurrentLocation) is not something the caller stated, so a
    // retry that omits it must not be treated as "a different release payload".
    if (request.CurrentLocationId && duplicate.CurrentLocationId !== request.CurrentLocationId) {
      throw new ConflictException('Putaway release idempotency key already used for a different release payload');
    }
    const requestedLocationCode = request.CurrentLocationCode?.trim();
    if (requestedLocationCode && duplicate.CurrentLocationCode !== requestedLocationCode) {
      throw new ConflictException('Putaway release idempotency key already used for a different release payload');
    }
  }

  // IFB-13: CurrentLocationId and CurrentLocationCode used to be defaulted independently (code ->
  // 'RECEIVING', id -> null), so a release created without an explicit CurrentLocationId could never
  // be putaway-confirmed later (ConfirmPutawayTaskUseCase requires a real SourceLocationId). Resolve
  // the code to a real Location row up front and fail loudly here if none exists, instead of letting
  // a null id silently propagate downstream.
  private async ResolveCurrentLocation(
    request: ReleaseInboundToPutawayDto,
    receipt: ReceiptEntity,
  ): Promise<{ Id: string | null; Code: string }> {
    const code = request.CurrentLocationCode?.trim() || DEFAULT_STAGING_LOCATION_CODE;
    if (request.CurrentLocationId) return { Id: request.CurrentLocationId, Code: code };
    const location = await this.locations.FindByWarehouseAndCode(receipt.WarehouseId, code);
    // Dual-review finding: FindByWarehouseAndCode doesn't filter by status, so without this check a
    // deactivated staging location would silently resolve here even though ResolveTarget (the
    // sibling target-location path in ReleasePutawayTaskUseCase) explicitly rejects inactive locations.
    if (!location || location.LocationStatus !== LocationStatus.Active) {
      throw new BusinessRuleException('Current staging location not found for putaway release', {
        WarehouseId: receipt.WarehouseId,
        LocationCode: code,
      });
    }
    return { Id: location.Id, Code: location.LocationCode };
  }

  private async ResolveReadiness(line: ReceiptLineEntity): Promise<ReleaseReadiness> {
    const result = await this.receiving.FindLatestQcResultByReceiptLineId(line.Id);
    if (result) return this.ReadinessFromQcResult(result);
    const task = await this.receiving.FindLatestQcTaskByReceiptLineId(line.Id);
    if (task) return this.ReadinessFromQcTask(task);
    return {
      Allowed: false,
      InventoryStatusCode: 'PENDING_QC',
      Quantity: 0,
      Reason: 'QC readiness must be evaluated before release to putaway',
      SourceType: 'MissingQc',
      SourceId: null,
    };
  }

  private ReadinessFromQcResult(result: QcResultEntity): ReleaseReadiness {
    if (result.TargetInventoryStatusCode === INVENTORY_READY_FOR_PUTAWAY) {
      return {
        Allowed: true,
        InventoryStatusCode: INVENTORY_READY_FOR_PUTAWAY,
        Quantity: result.AcceptedQuantity,
        Reason: 'QC result is ready for putaway',
        SourceType: 'QcResult',
        SourceId: result.Id,
      };
    }
    const status = result.TargetInventoryStatusCode;
    return {
      Allowed: false,
      InventoryStatusCode: status,
      Quantity: 0,
      Reason: `Inventory status ${status} cannot be released to putaway`,
      SourceType: 'QcResult',
      SourceId: result.Id,
    };
  }

  private ReadinessFromQcTask(task: QcTaskEntity): ReleaseReadiness {
    if (
      task.TaskStatus === QcTaskStatus.NotRequired &&
      task.TargetInventoryStatusCode === INVENTORY_READY_FOR_PUTAWAY
    ) {
      return {
        Allowed: true,
        InventoryStatusCode: INVENTORY_READY_FOR_PUTAWAY,
        Quantity: task.ActualQuantity,
        Reason: 'QC was skipped and target inventory status is ready for putaway',
        SourceType: 'QcTask',
        SourceId: task.Id,
      };
    }
    const status = task.InventoryStatusCode || task.TargetInventoryStatusCode || 'PENDING_QC';
    const blockedStatus = BLOCKED_RELEASE_STATUSES.has(status) ? status : 'PENDING_QC';
    return {
      Allowed: false,
      InventoryStatusCode: blockedStatus,
      Quantity: 0,
      Reason: `Inventory status ${blockedStatus} cannot be released to putaway`,
      SourceType: 'QcTask',
      SourceId: task.Id,
    };
  }

  private ProfileRequiresLpn(profile: WarehouseProfileEntity | null): boolean {
    const policy = profile?.StrategyPolicy ?? {};
    return this.BoolPolicy(policy.inboundLpnRequired) || this.BoolPolicy(policy.lpnRequired);
  }

  private BoolPolicy(value: unknown): boolean {
    return value === true || String(value).toLowerCase() === 'true';
  }

  private async ValidateLabelReadiness(
    request: ReleaseInboundToPutawayDto,
    context: AuditContext,
    receipt: ReceiptEntity,
    line: ReceiptLineEntity,
    profile: WarehouseProfileEntity | null,
  ): Promise<LabelBlockingValidationResultDto | null> {
    if (!profile) return null;
    return await this.labelBlocking.Execute(
      {
        DownstreamAction: LabelBlockingDownstreamAction.Putaway,
        BusinessObjectType: 'ReceiptLine',
        BusinessObjectId: line.Id,
        BusinessObjectCode: receipt.ReceiptNumber,
        WarehouseProfileId: profile.Id,
        WarehouseId: receipt.WarehouseId,
        OwnerId: receipt.OwnerId,
        AttemptOverride: request.AttemptLabelOverride,
        ReasonCode: request.ReasonCode,
        ReasonNote: request.ReasonNote,
        EvidenceRefs: request.EvidenceRefs,
      },
      context,
    );
  }

  private async AuditBlocked(
    context: AuditContext,
    receipt: ReceiptEntity,
    line: ReceiptLineEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: undefined,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Receipt,
        ObjectId: receipt.Id,
        ObjectCode: receipt.ReceiptNumber,
        AfterJson: {
          Decision: 'Blocked',
          Reason: reason,
          ReceiptLineId: line.Id,
          ...details,
        },
        ReferenceType: 'InboundPutawayReleaseBlocked',
        ReferenceId: line.Id,
        WarehouseId: receipt.WarehouseId,
        OwnerId: receipt.OwnerId,
        Result: AuditResult.Failed,
      }),
    }));
  }

  private BuildOutbox(
    outboxId: string,
    businessReference: string,
    release: InboundPutawayReleaseEntity,
  ): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `InboundReleasedToPutaway:${release.ReceiptLineId}:${release.IdempotencyKey}`,
      EventType: 'InboundReleasedToPutaway',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: release.WarehouseCode ?? release.WarehouseId,
      OwnerContext: release.OwnerCode ?? release.OwnerId,
      EventTime: release.ReleasedAt,
      CorrelationId: release.ReceiptId,
      CausationId: release.Id,
      Payload: {
        ReceiptId: release.ReceiptId,
        ReceiptLineId: release.ReceiptLineId,
        InboundPlanId: release.InboundPlanId,
        InboundPlanLineId: release.InboundPlanLineId,
        InboundLpnId: release.InboundLpnId,
        LpnCode: release.LpnCode,
        SsccCode: release.SsccCode,
        OwnerId: release.OwnerId,
        OwnerCode: release.OwnerCode,
        WarehouseId: release.WarehouseId,
        WarehouseCode: release.WarehouseCode,
        SkuId: release.SkuId,
        SkuCode: release.SkuCode,
        UomId: release.UomId,
        UomCode: release.UomCode,
        Quantity: release.Quantity,
        InventoryStatusCode: release.InventoryStatusCode,
        CurrentLocationId: release.CurrentLocationId,
        CurrentLocationCode: release.CurrentLocationCode,
        ConstraintJson: release.ConstraintJson,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: release.ReleasedBy,
    });
  }
}
