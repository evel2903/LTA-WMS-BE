import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
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
import { ConfirmReceiptLineDto, ReceiptLineDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceiptLineDiscrepancySignal } from '@modules/Inbound/Domain/Enums/ReceiptLineDiscrepancySignal';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';

export class ConfirmReceiptLineUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly readiness: ValidateReceivingReadinessUseCase,
    private readonly skus: ISkuRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ConfirmReceiptLineDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ReceiptLineDto> {
    this.AssertRequest(request);
    const receipt = await this.receiving.FindReceiptById(request.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found');

    await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, receipt);

    const duplicate = await this.receiving.FindReceiptLineByIdempotencyKey(receipt.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateReceiptLineMatches(duplicate, request);
      return ReceivingDtoMapper.ToLineDto(duplicate, true);
    }

    const readiness = await this.readiness.Execute({ Id: receipt.InboundPlanId }, context);
    if (!readiness.Allowed) throw new BusinessRuleException(readiness.Reason);

    const aggregate = await this.inboundPlans.FindById(receipt.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for receipt');
    const planLine = aggregate.Lines.find((line) => line.Id === request.InboundPlanLineId);
    if (!planLine) throw new BusinessRuleException('Inbound plan line not found for receipt line');

    let reasonCodeId: string | null = null;
    if (request.ManualConfirm) {
      if (!request.ReasonCode?.trim()) throw new BusinessRuleException('Manual receipt confirm reason is required');
      await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Override, receipt);
      const reason = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Override,
        ObjectType: ObjectType.Receipt,
      });
      reasonCodeId = reason.ReasonCodeId;
    } else if (!request.ScanEvidence?.RawValue && !request.ScanEvidence?.ScanEventId) {
      throw new BusinessRuleException('Scan evidence is required for receipt line confirm');
    }

    const actualSkuId = request.SkuId?.trim() || planLine.SkuId;
    const actualUomId = request.UomId?.trim() || planLine.UomId;
    const sku = await this.skus.FindById(actualSkuId);
    if (!sku) throw new BusinessRuleException('SKU not found for receipt line', { SkuId: actualSkuId });
    this.AssertCaptureRequiredBySku(sku, request);
    await this.AssertSerialNotDuplicated(sku, request);
    // IFB-20: a SerialControlled SKU is forced (above) to ActualQuantity=1 per call, so comparing
    // a single call's quantity to the whole plan line's ExpectedQuantity always looks "wrong" for
    // every unit of a multi-unit serial line. Only for SerialControlled SKUs, compare the running
    // total received so far (across all existing receipt lines for this plan line) plus this call.
    const cumulativeActualQuantity = sku.SerialControlled
      ? request.ActualQuantity +
        (await this.receiving.ListReceiptLinesByReceiptId(receipt.Id))
          .filter((existingLine) => existingLine.InboundPlanLineId === planLine.Id)
          .reduce((sum, existingLine) => sum + existingLine.ActualQuantity, 0)
      : request.ActualQuantity;
    const signals = this.DiscrepancySignals(request, planLine, actualSkuId, actualUomId, sku, cumulativeActualQuantity);
    const now = new Date();
    const line = new ReceiptLineEntity({
      Id: randomUUID(),
      ReceiptId: receipt.Id,
      InboundPlanId: receipt.InboundPlanId,
      InboundPlanLineId: planLine.Id,
      LineNumber: planLine.LineNumber,
      SkuId: actualSkuId,
      SkuCode: actualSkuId === planLine.SkuId ? planLine.SkuCode : null,
      UomId: actualUomId,
      UomCode: actualUomId === planLine.UomId ? planLine.UomCode : null,
      ExpectedQuantity: planLine.ExpectedQuantity,
      ActualQuantity: request.ActualQuantity,
      Status: signals.length ? ReceiptLineStatus.Discrepancy : ReceiptLineStatus.Received,
      ManualConfirm: request.ManualConfirm ?? false,
      ReasonCode: request.ReasonCode ?? null,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      ScanEvidenceJson: request.ScanEvidence ? (request.ScanEvidence as unknown as Record<string, unknown>) : null,
      DiscrepancySignals: signals,
      LotNumber: request.LotNumber?.trim() || null,
      ExpiryDate: request.ExpiryDate ? new Date(request.ExpiryDate) : null,
      SerialNumber: request.SerialNumber?.trim() || null,
      IdempotencyKey: request.IdempotencyKey,
      ReceivedAt: now,
      ReceivedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const beforeReceipt = ReceivingDtoMapper.ToReceiptDto(receipt);
    receipt.MarkLineReceived(context.ActorUserId);

    const outbox = this.BuildOutbox(receipt, line, aggregate.Plan.BusinessReference);
    const milestone = receipt.CoreFlowInstanceId
      ? new WorkflowMilestoneEntity({
          Id: randomUUID(),
          CoreFlowInstanceId: receipt.CoreFlowInstanceId,
          StageCode: CoreFlowStageCode.Inbound,
          StepCode: CoreFlowStepCode.ReceiptLineReceived,
          MilestoneStatus: WorkflowMilestoneStatus.Completed,
          Metadata: {
            ReceiptId: receipt.Id,
            ReceiptLineId: line.Id,
            InboundPlanLineId: line.InboundPlanLineId,
            ActualQuantity: line.ActualQuantity,
            DiscrepancySignals: line.DiscrepancySignals,
          },
          OccurredAt: line.ReceivedAt,
          CreatedBy: context.ActorUserId,
        })
      : null;

    return this.audited.Run(async (manager) => {
      await this.receiving.UpdateReceipt(receipt, manager);
      const createdLine = await this.receiving.CreateReceiptLine(line, manager);
      await this.integrations.CreateOutboxMessage(outbox, manager);
      if (milestone) await this.coreFlows.CreateMilestone(milestone, manager);
      const result = ReceivingDtoMapper.ToLineDto(createdLine);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: line.ManualConfirm ? ActionCode.Override : ActionCode.Update,
          ObjectType: ObjectType.Receipt,
          ObjectId: receipt.Id,
          ObjectCode: receipt.ReceiptNumber,
          BeforeJson: beforeReceipt as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReasonCodeId: line.ReasonCodeId,
          ReasonNote: line.ReasonNote,
          EvidenceRefs: line.ScanEvidenceJson ? [JSON.stringify(line.ScanEvidenceJson)] : null,
          ReferenceType: 'ReceiptLine',
          ReferenceId: createdLine.Id,
          WarehouseId: receipt.WarehouseId,
          OwnerId: receipt.OwnerId,
        }),
      };
    });
  }

  private AssertRequest(request: ConfirmReceiptLineDto): void {
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('Receipt line idempotency key is required');
    if (!request.InboundPlanLineId?.trim()) throw new BusinessRuleException('Inbound plan line is required');
    if (request.ActualQuantity <= 0) throw new BusinessRuleException('Actual quantity must be positive');
    // class-validator's @IsDateString() is a format regex, not calendar-aware -- it accepts
    // '2027-02-30'. JS then silently rolls that forward to 2027-03-02 instead of erroring, which
    // would corrupt the exact field this story exists to make trustworthy. Round-trip through
    // ISO and compare the date part to catch calendar-invalid input before it's ever persisted.
    if (request.ExpiryDate) {
      const parsed = new Date(request.ExpiryDate);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== request.ExpiryDate.slice(0, 10)) {
        throw new BusinessRuleException('ExpiryDate must be a valid calendar date');
      }
    }
  }

  // IDC-02: a SKU's Lot/Expiry/Serial control flags were previously pure CRUD toggles with no
  // downstream effect (Epic 26 audit). This is the enforcement point for receiving -- IDC-01
  // already added the capture fields, this makes them mandatory whenever the SKU declares it
  // needs them.
  private AssertCaptureRequiredBySku(sku: SkuEntity, request: ConfirmReceiptLineDto): void {
    if (sku.LotControlled && !request.LotNumber?.trim()) {
      throw new BusinessRuleException('LotNumber is required for this SKU', { SkuId: sku.Id });
    }
    if (sku.ExpiryControlled && !request.ExpiryDate) {
      throw new BusinessRuleException('ExpiryDate is required for this SKU', { SkuId: sku.Id });
    }
    if (sku.SerialControlled && !request.SerialNumber?.trim()) {
      throw new BusinessRuleException('SerialNumber is required for this SKU', { SkuId: sku.Id });
    }
    // IFB-14: SerialNumber is a single scalar field -- one value cannot identify N>1 physical
    // units. Receiving Quantity=3 with one SerialNumber previously silently discarded per-unit
    // identity for 2 of the 3 units, all the way down into the inventory ledger. Fail loud instead
    // of accepting data the rest of the system can't represent correctly.
    if (sku.SerialControlled && request.ActualQuantity !== 1) {
      throw new BusinessRuleException(
        'SerialControlled SKU requires ActualQuantity = 1 per receipt line; split into separate lines for multi-unit serial capture',
        { SkuId: sku.Id, ActualQuantity: request.ActualQuantity },
      );
    }
  }

  // IFB-15: SerialNumber had no uniqueness check anywhere -- two receipt lines (same SKU) could
  // be confirmed with the identical serial and nothing would ever flag it. Downstream, if the
  // duplicated serial's other dimension attributes also match at putaway, InventoryDimensionKeyService
  // silently merges two distinct physical units into one balance row. This runs after the
  // idempotency-key retry check above, so a legitimate retry of the same payload (including its
  // own serial) is never rejected by this guard -- only a NEW line reusing another line's serial is.
  private async AssertSerialNotDuplicated(sku: SkuEntity, request: ConfirmReceiptLineDto): Promise<void> {
    if (!sku.SerialControlled) return;
    const serialNumber = request.SerialNumber?.trim();
    if (!serialNumber) return;
    const existing = await this.receiving.FindReceiptLineBySkuAndSerial(sku.Id, serialNumber);
    if (existing) {
      throw new BusinessRuleException('SerialNumber has already been received for this SKU', {
        SkuId: sku.Id,
        SerialNumber: serialNumber,
        ExistingReceiptLineId: existing.Id,
      });
    }
  }

  private AssertDuplicateReceiptLineMatches(existing: ReceiptLineEntity, request: ConfirmReceiptLineDto): void {
    const mismatches: string[] = [];
    const compare = (field: string, actual: unknown, expected: unknown) => {
      if (actual !== expected) mismatches.push(field);
    };

    compare('InboundPlanLineId', request.InboundPlanLineId, existing.InboundPlanLineId);
    compare('ActualQuantity', request.ActualQuantity, existing.ActualQuantity);
    compare('ManualConfirm', request.ManualConfirm ?? false, existing.ManualConfirm);
    compare('ReasonCode', request.ReasonCode ?? null, existing.ReasonCode);
    compare('ReasonNote', request.ReasonNote ?? null, existing.ReasonNote);

    if (request.SkuId?.trim()) compare('SkuId', request.SkuId.trim(), existing.SkuId);
    if (request.UomId?.trim()) compare('UomId', request.UomId.trim(), existing.UomId);
    // Unlike SkuId/UomId above, Lot/Expiry/Serial are compared unconditionally (not only when
    // resent) -- this story's entire point is trustworthy Lot/Expiry/Serial identity, so a retry
    // that silently drops one of these fields from the original payload must be treated as a
    // mismatch, not as "field not mentioned, assume unchanged".
    compare('LotNumber', request.LotNumber?.trim() || null, existing.LotNumber);
    compare('SerialNumber', request.SerialNumber?.trim() || null, existing.SerialNumber);
    compare(
      'ExpiryDate',
      request.ExpiryDate ? new Date(request.ExpiryDate).getTime() : null,
      existing.ExpiryDate?.getTime() ?? null,
    );

    const requestEvidence = request.ScanEvidence ? (request.ScanEvidence as unknown as Record<string, unknown>) : null;
    if (this.CanonicalJson(requestEvidence) !== this.CanonicalJson(existing.ScanEvidenceJson)) {
      mismatches.push('ScanEvidence');
    }

    if (mismatches.length > 0) {
      throw new ConflictException('Receipt line idempotency key was reused with different payload', {
        ReceiptId: existing.ReceiptId,
        IdempotencyKey: existing.IdempotencyKey,
        Mismatches: mismatches,
      });
    }
  }

  private CanonicalJson(value: unknown): string {
    return JSON.stringify(this.SortJson(value));
  }

  private SortJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.SortJson(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, this.SortJson(item)]),
    );
  }

  private DiscrepancySignals(
    request: ConfirmReceiptLineDto,
    planLine: InboundPlanLineEntity,
    actualSkuId: string,
    actualUomId: string,
    sku: SkuEntity,
    cumulativeActualQuantity: number,
  ): ReceiptLineDiscrepancySignal[] {
    const signals: ReceiptLineDiscrepancySignal[] = [];
    // IFB-20: SerialControlled lines are received one unit per call, so only a running total
    // that exceeds ExpectedQuantity is an unambiguous variance (over-receipt). A running total
    // still under ExpectedQuantity is not flagged -- the system has no "closing" signal to say
    // no more units are coming, so a partial total is never provably wrong yet. Non-serial SKUs
    // keep the original single-call comparison unchanged (a single confirm already represents
    // the whole receiving action for that line).
    const hasQuantityVariance = sku.SerialControlled
      ? cumulativeActualQuantity > planLine.ExpectedQuantity
      : request.ActualQuantity !== planLine.ExpectedQuantity;
    if (hasQuantityVariance) {
      signals.push(ReceiptLineDiscrepancySignal.QuantityVariance);
    }
    if (actualSkuId !== planLine.SkuId) signals.push(ReceiptLineDiscrepancySignal.WrongSku);
    if (actualUomId !== planLine.UomId) signals.push(ReceiptLineDiscrepancySignal.WrongUom);
    if (
      request.ScanEvidence?.ResolvedSkuId &&
      request.ScanEvidence.ResolvedSkuId !== planLine.SkuId &&
      !signals.includes(ReceiptLineDiscrepancySignal.WrongSku)
    ) {
      signals.push(ReceiptLineDiscrepancySignal.WrongSku);
    }
    if (
      request.ScanEvidence?.ResolvedUomId &&
      request.ScanEvidence.ResolvedUomId !== planLine.UomId &&
      !signals.includes(ReceiptLineDiscrepancySignal.WrongUom)
    ) {
      signals.push(ReceiptLineDiscrepancySignal.WrongUom);
    }
    if (request.ScanEvidence?.ScanResult === 'Rejected') {
      signals.push(ReceiptLineDiscrepancySignal.UnresolvedBarcode);
    }
    return signals;
  }

  private BuildOutbox(receipt: ReceiptEntity, line: ReceiptLineEntity, businessReference: string): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: randomUUID(),
      MessageId: `ReceiptLineReceived:${receipt.Id}:${line.IdempotencyKey}`,
      EventType: 'ReceiptLineReceived',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: receipt.WarehouseCode ?? receipt.WarehouseId,
      OwnerContext: receipt.OwnerCode ?? receipt.OwnerId,
      EventTime: line.ReceivedAt,
      CorrelationId: receipt.CoreFlowInstanceId,
      CausationId: line.Id,
      Payload: {
        ReceiptId: receipt.Id,
        ReceiptLineId: line.Id,
        InboundPlanId: receipt.InboundPlanId,
        InboundPlanLineId: line.InboundPlanLineId,
        ActualQuantity: line.ActualQuantity,
        ManualConfirm: line.ManualConfirm,
        DiscrepancySignals: line.DiscrepancySignals,
        ScanEvidence: line.ScanEvidenceJson,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: line.ReceivedBy,
    });
  }
}
