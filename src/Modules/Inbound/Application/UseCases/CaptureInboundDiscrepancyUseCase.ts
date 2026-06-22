import { randomUUID } from 'crypto';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { CaptureInboundDiscrepancyDto, InboundDiscrepancyDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { ReceiptLineDiscrepancySignal } from '@modules/Inbound/Domain/Enums/ReceiptLineDiscrepancySignal';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { InboundDiscrepancyToleranceDecision } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyToleranceDecision';
import { InboundDiscrepancyType } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyType';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

const INBOUND_DISCREPANCY_EXCEPTION_TYPE = 'CTRL-EX-04';

export class CaptureInboundDiscrepancyUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly exceptionCases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: CaptureInboundDiscrepancyDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundDiscrepancyDto> {
    this.AssertRequest(request);
    const receipt = await this.receiving.FindReceiptById(request.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found');

    await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, receipt);

    const duplicate = await this.receiving.FindInboundDiscrepancyByIdempotencyKey(receipt.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, request);
      return ReceivingDtoMapper.ToDiscrepancyDto(duplicate, true);
    }

    await this.AssertExceptionPermission(context, receipt.WarehouseId, receipt.OwnerId);

    const line = await this.receiving.FindReceiptLineById(request.ReceiptLineId);
    if (!line || line.ReceiptId !== receipt.Id) throw new BusinessRuleException('Receipt line not found for receipt');

    const aggregate = await this.inboundPlans.FindById(receipt.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for receipt');
    const planLine = aggregate.Lines.find((item) => item.Id === line.InboundPlanLineId);
    if (!planLine) throw new BusinessRuleException('Inbound plan line not found for discrepancy');

    if (!line.DiscrepancySignals.length && !this.IsExplicitDiscrepancy(request.DiscrepancyType)) {
      throw new BusinessRuleException('Receipt line has no discrepancy signal to route');
    }
    if (!this.IsDiscrepancyTypeCompatible(request.DiscrepancyType, line.DiscrepancySignals)) {
      throw new BusinessRuleException('Discrepancy type does not match receipt-line signal');
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    const catalogEntry = await this.controlExceptionCatalog.ValidateExceptionType(INBOUND_DISCREPANCY_EXCEPTION_TYPE);
    const toleranceDecision = await this.DecideTolerance(
      request,
      line.ActualQuantity,
      line.ExpectedQuantity,
      aggregate.Plan.WarehouseProfileId,
    );
    const status = this.StatusFromTolerance(toleranceDecision);
    const severity = this.SeverityFromTolerance(toleranceDecision, catalogEntry.Severity);
    const now = new Date();
    const exception = new ExceptionCaseEntity({
      Id: randomUUID(),
      ExceptionType: catalogEntry.Code,
      State: ExceptionState.Detected,
      ReferenceType: 'ReceiptLine',
      ReferenceId: line.Id,
      WarehouseId: receipt.WarehouseId,
      OwnerId: receipt.OwnerId,
      Severity: severity,
      EvidenceRefs: this.BuildEvidenceRefs(request),
      OpenedAt: now,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
    });
    const discrepancy = new InboundDiscrepancyEntity({
      Id: randomUUID(),
      ReceiptId: receipt.Id,
      ReceiptLineId: line.Id,
      InboundPlanId: receipt.InboundPlanId,
      InboundPlanLineId: line.InboundPlanLineId,
      OwnerId: receipt.OwnerId,
      OwnerCode: receipt.OwnerCode,
      WarehouseId: receipt.WarehouseId,
      WarehouseCode: receipt.WarehouseCode,
      DiscrepancyType: request.DiscrepancyType,
      Signals: line.DiscrepancySignals,
      Status: status,
      Severity: severity,
      ToleranceDecision: toleranceDecision,
      ExpectedQuantity: line.ExpectedQuantity,
      ActualQuantity: line.ActualQuantity,
      ReasonCode: request.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      EvidenceJson: request.EvidenceJson ?? null,
      ExceptionCaseId: exception.Id,
      ExceptionState: exception.State,
      IdempotencyKey: request.IdempotencyKey,
      RecordedAt: now,
      RecordedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const outbox = this.BuildOutbox(receipt.BusinessReference, discrepancy);
    const milestone = receipt.CoreFlowInstanceId
      ? new WorkflowMilestoneEntity({
          Id: randomUUID(),
          CoreFlowInstanceId: receipt.CoreFlowInstanceId,
          StageCode: CoreFlowStageCode.Inbound,
          StepCode: CoreFlowStepCode.DiscrepancyRecorded,
          MilestoneStatus: WorkflowMilestoneStatus.Completed,
          Metadata: {
            ReceiptId: receipt.Id,
            ReceiptLineId: line.Id,
            DiscrepancyId: discrepancy.Id,
            ExceptionCaseId: exception.Id,
            DiscrepancyType: discrepancy.DiscrepancyType,
            ToleranceDecision: discrepancy.ToleranceDecision,
          },
          OccurredAt: now,
          CreatedBy: context.ActorUserId,
        })
      : null;

    try {
      return await this.audited.Run(async (manager) => {
        await this.exceptionCases.Create(exception, manager);
        const createdDiscrepancy = await this.receiving.CreateInboundDiscrepancy(discrepancy, manager);
        await this.integrations.CreateOutboxMessage(outbox, manager);
        if (milestone) await this.coreFlows.CreateMilestone(milestone, manager);
        const result = ReceivingDtoMapper.ToDiscrepancyDto(createdDiscrepancy);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.Receipt,
            ObjectId: receipt.Id,
            ObjectCode: receipt.ReceiptNumber,
            AfterJson: result as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: request.ReasonNote ?? null,
            EvidenceRefs: this.BuildEvidenceRefs(request),
            ReferenceType: 'InboundDiscrepancy',
            ReferenceId: createdDiscrepancy.Id,
            WarehouseId: receipt.WarehouseId,
            OwnerId: receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.receiving.FindInboundDiscrepancyByIdempotencyKey(
          receipt.Id,
          request.IdempotencyKey,
        );
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, request);
          return ReceivingDtoMapper.ToDiscrepancyDto(concurrentDuplicate, true);
        }
      }
      throw error;
    }
  }

  private AssertRequest(request: CaptureInboundDiscrepancyDto): void {
    if (!request.ReceiptId?.trim()) throw new BusinessRuleException('Receipt is required for discrepancy');
    if (!request.ReceiptLineId?.trim()) throw new BusinessRuleException('Receipt line is required for discrepancy');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('Discrepancy idempotency key is required');
    if (!request.ReasonCode?.trim()) throw new BusinessRuleException('Discrepancy reason is required');
    if (!this.HasEvidence(request)) throw new BusinessRuleException('Discrepancy evidence is required');
  }

  private async AssertExceptionPermission(context: AuditContext, warehouseId: string, ownerId: string): Promise<void> {
    if (!this.permissionChecker || !context.ActorUserId) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: ActionCode.Create,
      ObjectType: ObjectType.ExceptionCase,
      Scope: { WarehouseId: warehouseId, OwnerId: ownerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason ?? 'OUT_OF_SCOPE'})`, {
        Reason: decision.Reason ?? 'OUT_OF_SCOPE',
        Action: ActionCode.Create,
        ObjectType: ObjectType.ExceptionCase,
      });
    }
  }

  private HasEvidence(request: CaptureInboundDiscrepancyDto): boolean {
    return Boolean(
      (request.EvidenceRefs?.some((item) => typeof item === 'string' && item.trim().length > 0) ?? false) ||
      (request.EvidenceJson && Object.keys(request.EvidenceJson).length > 0),
    );
  }

  private AssertDuplicateMatchesRequest(
    duplicate: InboundDiscrepancyEntity,
    request: CaptureInboundDiscrepancyDto,
  ): void {
    if (duplicate.ReceiptLineId !== request.ReceiptLineId || duplicate.DiscrepancyType !== request.DiscrepancyType) {
      throw new ConflictException('Discrepancy idempotency key already used for a different request');
    }
  }

  private IsExplicitDiscrepancy(type: InboundDiscrepancyType): boolean {
    return type === InboundDiscrepancyType.DamagedGoods || type === InboundDiscrepancyType.MissingDocument;
  }

  private IsDiscrepancyTypeCompatible(type: InboundDiscrepancyType, signals: ReceiptLineDiscrepancySignal[]): boolean {
    if (this.IsExplicitDiscrepancy(type)) return true;
    return signals.includes(type as unknown as ReceiptLineDiscrepancySignal);
  }

  private async DecideTolerance(
    request: CaptureInboundDiscrepancyDto,
    actualQuantity: number,
    expectedQuantity: number,
    warehouseProfileId: string | null,
  ): Promise<InboundDiscrepancyToleranceDecision> {
    if (request.DiscrepancyType !== InboundDiscrepancyType.QuantityVariance || actualQuantity <= expectedQuantity) {
      return InboundDiscrepancyToleranceDecision.NotApplicable;
    }
    const profile = warehouseProfileId ? await this.profiles.FindById(warehouseProfileId) : null;
    const thresholdPercent = this.NumberPolicy(profile?.ThresholdPolicy?.receivingOverTolerancePercent) ?? 0;
    const actualPercent = expectedQuantity === 0 ? 100 : ((actualQuantity - expectedQuantity) / expectedQuantity) * 100;
    if (actualPercent <= thresholdPercent) return InboundDiscrepancyToleranceDecision.WithinTolerance;
    const mode = String(profile?.StrategyPolicy?.receivingOverToleranceMode ?? 'approval').toLowerCase();
    return mode === 'hard_block'
      ? InboundDiscrepancyToleranceDecision.OverToleranceHardBlocked
      : InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval;
  }

  private NumberPolicy(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private StatusFromTolerance(decision: InboundDiscrepancyToleranceDecision): InboundDiscrepancyStatus {
    if (decision === InboundDiscrepancyToleranceDecision.OverToleranceHardBlocked) {
      return InboundDiscrepancyStatus.Blocked;
    }
    if (decision === InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval) {
      return InboundDiscrepancyStatus.PendingApproval;
    }
    return InboundDiscrepancyStatus.Routed;
  }

  private SeverityFromTolerance(
    decision: InboundDiscrepancyToleranceDecision,
    defaultSeverity: ControlExceptionSeverity,
  ): ControlExceptionSeverity {
    return decision === InboundDiscrepancyToleranceDecision.OverToleranceHardBlocked
      ? ControlExceptionSeverity.High
      : defaultSeverity;
  }

  private BuildEvidenceRefs(request: CaptureInboundDiscrepancyDto): string[] {
    const refs = request.EvidenceRefs ?? [];
    if (request.EvidenceJson && Object.keys(request.EvidenceJson).length > 0) {
      return [...refs, JSON.stringify(request.EvidenceJson)];
    }
    return refs;
  }

  private BuildOutbox(businessReference: string, discrepancy: InboundDiscrepancyEntity): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: randomUUID(),
      MessageId: `DiscrepancyRecorded:${discrepancy.ReceiptId}:${discrepancy.IdempotencyKey}`,
      EventType: 'DiscrepancyRecorded',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: discrepancy.WarehouseCode ?? discrepancy.WarehouseId,
      OwnerContext: discrepancy.OwnerCode ?? discrepancy.OwnerId,
      EventTime: discrepancy.RecordedAt,
      CorrelationId: discrepancy.ReceiptId,
      CausationId: discrepancy.Id,
      Payload: {
        DiscrepancyId: discrepancy.Id,
        ReceiptId: discrepancy.ReceiptId,
        ReceiptLineId: discrepancy.ReceiptLineId,
        InboundPlanId: discrepancy.InboundPlanId,
        DiscrepancyType: discrepancy.DiscrepancyType,
        Signals: discrepancy.Signals,
        ToleranceDecision: discrepancy.ToleranceDecision,
        ExceptionCaseId: discrepancy.ExceptionCaseId,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: discrepancy.RecordedBy,
    });
  }
}
