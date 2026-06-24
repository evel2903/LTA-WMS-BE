import { createHash, randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import {
  ImportOutboundOrderDto,
  ListOutboundOrdersDto,
  OutboundOrderDto,
  ReasonOutboundOrderDto,
} from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { OutboundOrderDtoMapper } from '@modules/Outbound/Application/Mappers/OutboundOrderDtoMapper';
import {
  AssertOutboundOrderPermission,
  CheckOutboundOrderPermission,
} from '@modules/Outbound/Application/Services/OutboundOrderPermission';
import {
  OutboundActionIdempotencyRecord,
  OutboundOrderEntity,
} from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface MasterResolution {
  OwnerCode: string | null;
  WarehouseCode: string | null;
  CustomerId: string | null;
  CustomerCode: string | null;
  ShipToReference: string | null;
  LineRefs: Array<{ SkuCode: string | null; UomCode: string | null; ValidationErrors: string[] }>;
  ValidationErrors: string[];
}

class OutboundOrderNoopResult extends Error {
  constructor(
    public readonly Aggregate: OutboundOrderAggregate,
    public readonly IsDuplicate: boolean,
  ) {
    super('Outbound order action is idempotent/no-op');
  }
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const VALIDATION_REASON_CODE = 'RC-V1-DISCREPANCY';

export class OutboundOrderLifecycleService {
  constructor(
    private readonly outboundOrders: IOutboundOrderRepository,
    private readonly partners: IPartnerRepository,
    private readonly owners: IOwnerRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly itemCoverages: IItemCoverageRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Import(request: ImportOutboundOrderDto, context: AuditContext): Promise<OutboundOrderDto> {
    const normalized = this.NormalizeImport(request);
    await AssertOutboundOrderPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, {
      WarehouseId: normalized.WarehouseId,
      OwnerId: normalized.OwnerId,
    });

    const fingerprint = this.Fingerprint('ImportOutboundOrder', this.ImportFingerprintPayload(normalized));
    const duplicateByIdempotency = await this.outboundOrders.FindByIdempotencyKey(normalized.IdempotencyKey);
    if (duplicateByIdempotency) return this.ReturnDuplicate(duplicateByIdempotency, fingerprint);

    const duplicateBySource = await this.outboundOrders.FindByBusinessKey(
      normalized.SourceSystem,
      normalized.SourceReference,
      normalized.OwnerId,
      normalized.WarehouseId,
    );
    if (duplicateBySource) return this.ReturnDuplicate(duplicateBySource, fingerprint);

    const resolution = await this.ResolveMasterData(normalized);
    const hasValidationErrors = resolution.ValidationErrors.length > 0;
    const reason = hasValidationErrors
      ? await this.ResolveReason(
          normalized.ReasonCode ?? VALIDATION_REASON_CODE,
          ActionCode.Create,
          normalized.ReasonNote,
          (normalized.EvidenceRefs ?? []).length
            ? (normalized.EvidenceRefs ?? [])
            : this.ValidationEvidence(resolution.ValidationErrors),
        )
      : null;
    const now = new Date();
    const orderId = randomUUID();
    const coreFlowId = randomUUID();
    const outboxId = randomUUID();
    const status = hasValidationErrors ? OutboundOrderStatus.Held : OutboundOrderStatus.Validated;
    const order = new OutboundOrderEntity({
      Id: orderId,
      OrderNumber: `OB-${now.getTime()}-${orderId.slice(0, 6).toUpperCase()}`,
      SourceSystem: normalized.SourceSystem,
      SourceReference: normalized.SourceReference,
      BusinessReference: this.BusinessReference(normalized),
      CustomerId: resolution.CustomerId,
      CustomerSourceSystem: normalized.CustomerSourceSystem ?? normalized.SourceSystem,
      CustomerExternalReference: normalized.CustomerExternalReference,
      CustomerCode: resolution.CustomerCode,
      ShipToReference: resolution.ShipToReference,
      OwnerId: normalized.OwnerId,
      OwnerCode: resolution.OwnerCode,
      WarehouseId: normalized.WarehouseId,
      WarehouseCode: resolution.WarehouseCode,
      Priority: normalized.Priority,
      CutoffAt: normalized.CutoffAt ? new Date(normalized.CutoffAt) : null,
      DocumentStatus: status,
      ValidationErrors: resolution.ValidationErrors,
      CoreFlowInstanceId: coreFlowId,
      OutboxMessageId: outboxId,
      ImportIdempotencyKey: normalized.IdempotencyKey,
      ImportPayloadFingerprint: fingerprint,
      ReasonCode: reason?.ReasonCode ?? null,
      ReasonCodeId: reason?.ReasonCodeId ?? null,
      ReasonNote: reason?.ReasonNote ?? null,
      EvidenceRefs: reason?.EvidenceRefs ?? [],
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
    });
    const lines = normalized.Lines.map(
      (line, index) =>
        new OutboundOrderLineEntity({
          Id: randomUUID(),
          OutboundOrderId: orderId,
          LineNumber: line.LineNumber,
          SkuId: line.SkuId,
          SkuCode: resolution.LineRefs[index]?.SkuCode ?? null,
          UomId: line.UomId,
          UomCode: resolution.LineRefs[index]?.UomCode ?? null,
          OrderedQuantity: line.OrderedQuantity,
          ExternalLineReference: line.ExternalLineReference,
          ValidationErrors: resolution.LineRefs[index]?.ValidationErrors ?? [],
          CreatedAt: now,
        }),
    );
    const coreFlow = new CoreFlowInstanceEntity({
      Id: coreFlowId,
      BusinessReference: order.BusinessReference,
      SourceSystem: order.SourceSystem,
      WarehouseCode: resolution.WarehouseCode ?? normalized.WarehouseId,
      OwnerCode: resolution.OwnerCode ?? normalized.OwnerId,
      CorrelationId: randomUUID(),
      CurrentStage: CoreFlowStageCode.Outbound,
      Status: CoreFlowInstanceStatus.Active,
      Metadata: { OutboundOrderId: orderId, SourceReference: order.SourceReference },
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
    });
    const milestone = new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: coreFlowId,
      StageCode: CoreFlowStageCode.Outbound,
      StepCode: CoreFlowStepCode.OutboundOrderReceived,
      MilestoneStatus: hasValidationErrors ? WorkflowMilestoneStatus.Blocked : WorkflowMilestoneStatus.Completed,
      Metadata: {
        OutboundOrderId: orderId,
        DocumentStatus: status,
        ValidationErrors: resolution.ValidationErrors,
      },
      OccurredAt: now,
      CreatedBy: context.ActorUserId,
    });
    const outbox = this.BuildOutbox(
      outboxId,
      order,
      lines,
      hasValidationErrors ? 'OutboundOrderValidationFailed' : 'OutboundOrderReceived',
    );

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.outboundOrders.Create(order, lines, manager);
        await this.coreFlows.CreateInstance(coreFlow, manager);
        await this.coreFlows.CreateMilestone(milestone, manager);
        await this.integrations.CreateOutboxMessage(outbox, manager);
        const dto = OutboundOrderDtoMapper.ToDto(created);
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.OutboundOrder,
            ObjectId: created.Order.Id,
            ObjectCode: created.Order.BusinessReference,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: reason?.ReasonCodeId ?? null,
            ReasonNote: reason?.ReasonNote ?? null,
            EvidenceRefs: reason?.EvidenceRefs ?? [],
            ReferenceType: 'OutboundOrderImport',
            ReferenceId: created.Order.Id,
            WarehouseId: created.Order.WarehouseId,
            OwnerId: created.Order.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const duplicate =
          (await this.outboundOrders.FindByIdempotencyKey(normalized.IdempotencyKey)) ??
          (await this.outboundOrders.FindByBusinessKey(
            normalized.SourceSystem,
            normalized.SourceReference,
            normalized.OwnerId,
            normalized.WarehouseId,
          ));
        if (duplicate) return this.ReturnDuplicate(duplicate, fingerprint);
      }
      throw error;
    }
  }

  public async List(query: ListOutboundOrdersDto, actorUserId?: string | null) {
    this.AssertPageSize(query.PageSize);
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: DEFAULT_PAGE_SIZE, MaxPageSize: MAX_PAGE_SIZE },
    );
    const candidates = await this.outboundOrders.ListCandidates(query);
    const allowed: OutboundOrderAggregate[] = [];
    for (const candidate of candidates) {
      if (
        await CheckOutboundOrderPermission(this.permissionChecker, actorUserId, ActionCode.Read, {
          WarehouseId: candidate.Order.WarehouseId,
          OwnerId: candidate.Order.OwnerId,
        })
      ) {
        allowed.push(candidate);
      }
    }
    return ToPagedResult(
      allowed.slice(paging.Skip, paging.Skip + paging.Take).map((item) => OutboundOrderDtoMapper.ToDto(item)),
      allowed.length,
      paging.Page,
      paging.PageSize,
    );
  }

  public async Get(id: string, actorUserId?: string | null): Promise<OutboundOrderDto> {
    const aggregate = await this.outboundOrders.FindById(id);
    if (!aggregate) throw new NotFoundException('Outbound order not found');
    await AssertOutboundOrderPermission(this.permissionChecker, actorUserId, ActionCode.Read, aggregate.Order);
    return OutboundOrderDtoMapper.ToDto(aggregate);
  }

  public async Validate(id: string, context: AuditContext): Promise<OutboundOrderDto> {
    const aggregate = await this.LoadForMutation(id, context, ActionCode.Update);
    return this.Revalidate(aggregate, context);
  }

  public async Hold(request: ReasonOutboundOrderDto, context: AuditContext): Promise<OutboundOrderDto> {
    const aggregate = await this.LoadForMutation(request.Id, context, ActionCode.Update);
    const reason = await this.ResolveReason(
      request.ReasonCode,
      ActionCode.Update,
      request.ReasonNote,
      request.EvidenceRefs ?? [],
    );
    return this.UpdateStatus(
      aggregate,
      OutboundOrderStatus.Held,
      context,
      ActionCode.Update,
      reason,
      'OutboundOrderHold',
      this.NormalizeActionIdempotencyKey(request.IdempotencyKey),
    );
  }

  public async Reject(request: ReasonOutboundOrderDto, context: AuditContext): Promise<OutboundOrderDto> {
    const aggregate = await this.LoadForMutation(request.Id, context, ActionCode.Update);
    const reason = await this.ResolveReason(
      request.ReasonCode,
      ActionCode.Update,
      request.ReasonNote,
      request.EvidenceRefs ?? [],
    );
    return this.UpdateStatus(
      aggregate,
      OutboundOrderStatus.Rejected,
      context,
      ActionCode.Update,
      reason,
      'OutboundOrderReject',
      this.NormalizeActionIdempotencyKey(request.IdempotencyKey),
    );
  }

  public async Cancel(request: ReasonOutboundOrderDto, context: AuditContext): Promise<OutboundOrderDto> {
    const aggregate = await this.LoadForMutation(request.Id, context, ActionCode.DeleteCancel);
    const reason = await this.ResolveReason(
      request.ReasonCode,
      ActionCode.DeleteCancel,
      request.ReasonNote,
      request.EvidenceRefs ?? [],
    );
    return this.UpdateStatus(
      aggregate,
      OutboundOrderStatus.Cancelled,
      context,
      ActionCode.DeleteCancel,
      reason,
      'OutboundOrderCancel',
      this.NormalizeActionIdempotencyKey(request.IdempotencyKey),
    );
  }

  private async LoadForMutation(
    id: string,
    context: AuditContext,
    action: ActionCode,
  ): Promise<OutboundOrderAggregate> {
    const aggregate = await this.outboundOrders.FindById(id);
    if (!aggregate) throw new NotFoundException('Outbound order not found');
    await AssertOutboundOrderPermission(this.permissionChecker, context.ActorUserId, action, aggregate.Order);
    return aggregate;
  }

  private async Revalidate(aggregate: OutboundOrderAggregate, context: AuditContext): Promise<OutboundOrderDto> {
    try {
      return await this.audited.Run(async (manager) => {
        const current = await this.outboundOrders.FindByIdForUpdate(aggregate.Order.Id, manager);
        if (!current) throw new NotFoundException('Outbound order not found');
        this.AssertTransitionAllowed(current.Order.DocumentStatus, OutboundOrderStatus.Validated);
        const resolution = await this.ResolveMasterData(this.ImportDtoFromAggregate(current));
        const hasValidationErrors = resolution.ValidationErrors.length > 0;
        const nextStatus = hasValidationErrors ? OutboundOrderStatus.Held : OutboundOrderStatus.Validated;
        const lineUpdates = current.Lines.map(
          (line, index) =>
            new OutboundOrderLineEntity({
              ...line,
              SkuCode: resolution.LineRefs[index]?.SkuCode ?? null,
              UomCode: resolution.LineRefs[index]?.UomCode ?? null,
              ValidationErrors: resolution.LineRefs[index]?.ValidationErrors ?? [],
            }),
        );
        const unchanged =
          current.Order.DocumentStatus === nextStatus &&
          this.StableStringify(current.Order.ValidationErrors) === this.StableStringify(resolution.ValidationErrors) &&
          this.StableStringify(current.Lines.map((line) => line.ValidationErrors)) ===
            this.StableStringify(lineUpdates.map((line) => line.ValidationErrors));
        if (unchanged) throw new OutboundOrderNoopResult(current, false);
        const reason = hasValidationErrors
          ? await this.ResolveReason(
              current.Order.ReasonCode ?? VALIDATION_REASON_CODE,
              ActionCode.Update,
              current.Order.ReasonNote,
              current.Order.EvidenceRefs.length
                ? current.Order.EvidenceRefs
                : this.ValidationEvidence(resolution.ValidationErrors),
            )
          : null;
        const before = OutboundOrderDtoMapper.ToDto(current);
        const now = new Date();
        const outboxId = randomUUID();
        const updated = new OutboundOrderEntity({
          ...current.Order,
          CustomerId: resolution.CustomerId,
          CustomerSourceSystem: current.Order.CustomerSourceSystem,
          CustomerExternalReference: current.Order.CustomerExternalReference,
          CustomerCode: resolution.CustomerCode,
          ShipToReference: resolution.ShipToReference,
          OwnerCode: resolution.OwnerCode,
          WarehouseCode: resolution.WarehouseCode,
          DocumentStatus: nextStatus,
          ValidationErrors: resolution.ValidationErrors,
          OutboxMessageId: outboxId,
          ReasonCode: reason?.ReasonCode ?? (hasValidationErrors ? current.Order.ReasonCode : null),
          ReasonCodeId: reason?.ReasonCodeId ?? (hasValidationErrors ? current.Order.ReasonCodeId : null),
          ReasonNote: reason?.ReasonNote ?? (hasValidationErrors ? current.Order.ReasonNote : null),
          EvidenceRefs: reason?.EvidenceRefs ?? (hasValidationErrors ? current.Order.EvidenceRefs : []),
          UpdatedAt: now,
          UpdatedBy: context.ActorUserId,
        });
        const saved = await this.outboundOrders.UpdateAggregate(updated, lineUpdates, manager);
        const dto = OutboundOrderDtoMapper.ToDto(saved);
        const eventType = hasValidationErrors ? 'OutboundOrderValidationFailed' : 'OutboundOrderValidated';
        const outbox = this.BuildOutbox(
          outboxId,
          saved.Order,
          saved.Lines,
          eventType,
          this.MessageSuffixForOutbox(outboxId),
        );
        await this.integrations.CreateOutboxMessage(outbox, manager);
        if (saved.Order.CoreFlowInstanceId) {
          await this.coreFlows.CreateMilestone(
            this.BuildMilestone(saved.Order, nextStatus, resolution.ValidationErrors, context.ActorUserId),
            manager,
          );
        }
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.OutboundOrder,
            ObjectId: saved.Order.Id,
            ObjectCode: saved.Order.BusinessReference,
            BeforeJson: before as unknown as Record<string, unknown>,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: reason?.ReasonCodeId ?? null,
            ReasonNote: reason?.ReasonNote ?? null,
            EvidenceRefs: reason?.EvidenceRefs ?? [],
            ReferenceType: 'OutboundOrderValidate',
            ReferenceId: saved.Order.Id,
            WarehouseId: saved.Order.WarehouseId,
            OwnerId: saved.Order.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof OutboundOrderNoopResult) {
        return OutboundOrderDtoMapper.ToDto(error.Aggregate, error.IsDuplicate);
      }
      throw error;
    }
  }

  private async UpdateStatus(
    aggregate: OutboundOrderAggregate,
    status: OutboundOrderStatus,
    context: AuditContext,
    action: ActionCode,
    reason: ReasonDecision | null,
    referenceType: string,
    idempotencyKey?: string,
  ): Promise<OutboundOrderDto> {
    const actionFingerprint = idempotencyKey
      ? this.Fingerprint(referenceType, {
          OrderId: aggregate.Order.Id,
          DocumentStatus: status,
          ReasonCode: reason?.ReasonCode ?? null,
          ReasonNote: reason?.ReasonNote ?? null,
          EvidenceRefs: reason?.EvidenceRefs ?? [],
        })
      : null;
    try {
      return await this.audited.Run(async (manager) => {
        const current = await this.outboundOrders.FindByIdForUpdate(aggregate.Order.Id, manager);
        if (!current) throw new NotFoundException('Outbound order not found');
        const existingAction = idempotencyKey ? current.Order.ActionIdempotency[idempotencyKey] : null;
        if (existingAction && existingAction.Fingerprint !== actionFingerprint) {
          throw new ConflictException('Outbound order action idempotency key reused with different payload', {
            OutboundOrderId: current.Order.Id,
            IdempotencyKey: idempotencyKey,
          });
        }
        if (existingAction) throw new OutboundOrderNoopResult(current, true);
        this.AssertTransitionAllowed(current.Order.DocumentStatus, status);
        if (!idempotencyKey && !reason && current.Order.DocumentStatus === status) {
          throw new OutboundOrderNoopResult(current, false);
        }

        const before = OutboundOrderDtoMapper.ToDto(current);
        const outboxId = randomUUID();
        const now = new Date();
        const actionIdempotency = {
          ...current.Order.ActionIdempotency,
          ...(idempotencyKey && actionFingerprint
            ? {
                [idempotencyKey]: {
                  Action: referenceType,
                  Fingerprint: actionFingerprint,
                  DocumentStatus: status,
                  OutboxMessageId: outboxId,
                  AppliedAt: now.toISOString(),
                } satisfies OutboundActionIdempotencyRecord,
              }
            : {}),
        };
        const updated = new OutboundOrderEntity({
          ...current.Order,
          DocumentStatus: status,
          OutboxMessageId: outboxId,
          ReasonCode: reason?.ReasonCode ?? current.Order.ReasonCode,
          ReasonCodeId: reason?.ReasonCodeId ?? current.Order.ReasonCodeId,
          ReasonNote: reason?.ReasonNote ?? current.Order.ReasonNote,
          EvidenceRefs: reason?.EvidenceRefs ?? current.Order.EvidenceRefs,
          ActionIdempotency: actionIdempotency,
          UpdatedAt: now,
          UpdatedBy: context.ActorUserId,
        });
        const saved = await this.outboundOrders.UpdateOrder(updated, manager);
        const dto = OutboundOrderDtoMapper.ToDto({ Order: saved, Lines: current.Lines });
        const outbox = this.BuildOutbox(
          outboxId,
          saved,
          current.Lines,
          this.EventTypeForReference(referenceType),
          this.MessageSuffixForOutbox(idempotencyKey ?? outboxId),
        );
        await this.integrations.CreateOutboxMessage(outbox, manager);
        if (saved.CoreFlowInstanceId) {
          await this.coreFlows.CreateMilestone(
            this.BuildMilestone(saved, status, saved.ValidationErrors, context.ActorUserId),
            manager,
          );
        }
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: action,
            ObjectType: ObjectType.OutboundOrder,
            ObjectId: saved.Id,
            ObjectCode: saved.BusinessReference,
            BeforeJson: before as unknown as Record<string, unknown>,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: reason?.ReasonCodeId ?? null,
            ReasonNote: reason?.ReasonNote ?? null,
            EvidenceRefs: reason?.EvidenceRefs ?? [],
            ReferenceType: referenceType,
            ReferenceId: saved.Id,
            WarehouseId: saved.WarehouseId,
            OwnerId: saved.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof OutboundOrderNoopResult) {
        return OutboundOrderDtoMapper.ToDto(error.Aggregate, error.IsDuplicate);
      }
      if (error instanceof ConflictException && idempotencyKey && actionFingerprint) {
        const current = await this.outboundOrders.FindById(aggregate.Order.Id);
        const existingAction = current?.Order.ActionIdempotency[idempotencyKey] ?? null;
        if (current && existingAction?.Fingerprint === actionFingerprint) {
          return OutboundOrderDtoMapper.ToDto(current, true);
        }
      }
      throw error;
    }
  }

  private async ResolveMasterData(request: ImportOutboundOrderDto): Promise<MasterResolution> {
    const validationErrors: string[] = [];
    const owner = await this.owners.FindById(request.OwnerId);
    if (!owner || owner.Status !== MasterDataStatus.Active) validationErrors.push('Owner not found or inactive');

    const warehouse = await this.warehouses.FindById(request.WarehouseId);
    if (!warehouse || warehouse.Status !== MasterDataStatus.Active)
      validationErrors.push('Warehouse not found or inactive');

    const customer = await this.ResolveCustomer(request);
    if (!customer) validationErrors.push('Customer not found or inactive');
    if (!request.ShipToReference) validationErrors.push('Ship-to reference is required');

    const lineRefs: MasterResolution['LineRefs'] = [];
    for (const line of request.Lines) {
      const lineErrors: string[] = [];
      const sku = await this.skus.FindById(line.SkuId);
      if (!sku || sku.ItemStatus !== SkuStatus.Active)
        lineErrors.push(`SKU not found or inactive at line ${line.LineNumber}`);
      if (sku?.DefaultOwnerId && sku.DefaultOwnerId !== request.OwnerId) {
        lineErrors.push(`SKU owner mismatch at line ${line.LineNumber}`);
      }
      if (sku?.OwnerControlled && sku.DefaultOwnerId !== request.OwnerId) {
        lineErrors.push(`Owner-controlled SKU is not assigned to owner at line ${line.LineNumber}`);
      }
      const uom = await this.uoms.FindById(line.UomId);
      if (!uom || uom.Status !== MasterDataStatus.Active)
        lineErrors.push(`UOM not found or inactive at line ${line.LineNumber}`);
      if (sku && line.UomId !== sku.BaseUomId && line.UomId !== sku.InventoryUomId) {
        lineErrors.push(`UOM is not valid for SKU at line ${line.LineNumber}`);
      }
      const coverage = sku
        ? await this.itemCoverages.FindBySkuWarehouseOwner(line.SkuId, request.WarehouseId, request.OwnerId)
        : null;
      if (!coverage || coverage.Status !== MasterDataStatus.Active) {
        lineErrors.push(`Item coverage not found or inactive at line ${line.LineNumber}`);
      }
      lineRefs.push({
        SkuCode: sku?.SkuCode ?? null,
        UomCode: uom?.UomCode ?? null,
        ValidationErrors: lineErrors,
      });
      validationErrors.push(...lineErrors);
    }

    return {
      OwnerCode: owner?.OwnerCode ?? null,
      WarehouseCode: warehouse?.WarehouseCode ?? null,
      CustomerId: customer?.Id ?? request.CustomerId ?? null,
      CustomerCode: customer?.PartnerCode ?? null,
      ShipToReference: request.ShipToReference ?? null,
      LineRefs: lineRefs,
      ValidationErrors: validationErrors,
    };
  }

  private async ResolveCustomer(request: ImportOutboundOrderDto) {
    const byId = request.CustomerId ? await this.partners.FindById(request.CustomerId) : null;
    if (byId && byId.PartnerType === PartnerType.Customer && byId.Status === PartnerStatus.Active) return byId;
    if (request.CustomerExternalReference) {
      const byReference = await this.partners.FindByExternalReference(
        PartnerType.Customer,
        request.CustomerSourceSystem ?? request.SourceSystem,
        request.CustomerExternalReference,
      );
      if (byReference && byReference.Status === PartnerStatus.Active) return byReference;
    }
    return null;
  }

  private async ResolveReason(
    reasonCode: string,
    action: ActionCode,
    reasonNote: string | null | undefined,
    evidenceRefs: string[],
  ): Promise<ReasonDecision> {
    if (!reasonCode) throw new BusinessRuleException('ReasonCode is required for outbound order action');
    const normalizedEvidence = this.NormalizeEvidence(evidenceRefs);
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: action,
      ObjectType: ObjectType.OutboundOrder,
    });
    if (reason.EvidenceRequired && normalizedEvidence.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for this outbound order reason', {
        ReasonCode: reasonCode,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required reason is not directly supported by V1-18 outbound import', {
        ReasonCode: reasonCode,
      });
    }
    return {
      ReasonCode: reasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: reasonNote?.trim() || null,
      EvidenceRefs: normalizedEvidence,
    };
  }

  private ReturnDuplicate(aggregate: OutboundOrderAggregate, expectedFingerprint: string): OutboundOrderDto {
    if (aggregate.Order.ImportPayloadFingerprint !== expectedFingerprint) {
      throw new ConflictException('Outbound order idempotency/source reference reused with different payload', {
        OutboundOrderId: aggregate.Order.Id,
        SourceReference: aggregate.Order.SourceReference,
      });
    }
    return OutboundOrderDtoMapper.ToDto(aggregate, true);
  }

  private BuildOutbox(
    id: string,
    order: OutboundOrderEntity,
    lines: OutboundOrderLineEntity[],
    eventType:
      | 'OutboundOrderReceived'
      | 'OutboundOrderValidationFailed'
      | 'OutboundOrderValidated'
      | 'OutboundOrderHeld'
      | 'OutboundOrderRejected'
      | 'OutboundOrderCancelled',
    messageSuffix?: string,
  ): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: id,
      MessageId: `${eventType}:${order.Id}${messageSuffix ? `:${messageSuffix}` : ''}`,
      EventType: eventType,
      Version: '1.0',
      BusinessReference: order.BusinessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: order.SourceSystem,
      WarehouseContext: order.WarehouseCode ?? order.WarehouseId,
      OwnerContext: order.OwnerCode ?? order.OwnerId,
      EventTime: order.UpdatedAt,
      CorrelationId: order.CoreFlowInstanceId,
      CausationId: order.Id,
      Payload: {
        OutboundOrderId: order.Id,
        SourceSystem: order.SourceSystem,
        SourceReference: order.SourceReference,
        CustomerId: order.CustomerId,
        CustomerSourceSystem: order.CustomerSourceSystem,
        CustomerExternalReference: order.CustomerExternalReference,
        CustomerCode: order.CustomerCode,
        ShipToReference: order.ShipToReference,
        DocumentStatus: order.DocumentStatus,
        ValidationErrors: order.ValidationErrors,
        Lines: lines.map((line) => ({
          LineNumber: line.LineNumber,
          SkuId: line.SkuId,
          UomId: line.UomId,
          OrderedQuantity: line.OrderedQuantity,
          ValidationErrors: line.ValidationErrors,
        })),
      },
      Status: OutboxMessageStatus.Pending,
      CreatedAt: order.UpdatedAt,
      CreatedBy: order.UpdatedBy ?? order.CreatedBy,
    });
  }

  private EventTypeForReference(
    referenceType: string,
  ): 'OutboundOrderValidated' | 'OutboundOrderHeld' | 'OutboundOrderRejected' | 'OutboundOrderCancelled' {
    if (referenceType === 'OutboundOrderHold') return 'OutboundOrderHeld';
    if (referenceType === 'OutboundOrderReject') return 'OutboundOrderRejected';
    if (referenceType === 'OutboundOrderCancel') return 'OutboundOrderCancelled';
    return 'OutboundOrderValidated';
  }

  private BuildMilestone(
    order: OutboundOrderEntity,
    status: OutboundOrderStatus,
    validationErrors: string[],
    actorUserId: string | null,
  ): WorkflowMilestoneEntity {
    return new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: order.CoreFlowInstanceId as string,
      StageCode: CoreFlowStageCode.Outbound,
      StepCode: CoreFlowStepCode.OutboundOrderReceived,
      MilestoneStatus:
        status === OutboundOrderStatus.Held || status === OutboundOrderStatus.Rejected
          ? WorkflowMilestoneStatus.Blocked
          : WorkflowMilestoneStatus.Completed,
      Metadata: {
        OutboundOrderId: order.Id,
        DocumentStatus: status,
        ValidationErrors: validationErrors,
      },
      OccurredAt: order.UpdatedAt,
      CreatedBy: actorUserId,
    });
  }

  private AssertTransitionAllowed(current: OutboundOrderStatus, next: OutboundOrderStatus): void {
    if (current === OutboundOrderStatus.Cancelled) {
      throw new BusinessRuleException('Cancelled outbound order cannot be mutated');
    }
    if (current === OutboundOrderStatus.Rejected && next !== OutboundOrderStatus.Rejected) {
      throw new BusinessRuleException('Rejected outbound order cannot be reopened by V1-18');
    }
  }

  private ImportDtoFromAggregate(aggregate: OutboundOrderAggregate): ImportOutboundOrderDto {
    return {
      SourceSystem: aggregate.Order.SourceSystem,
      SourceReference: aggregate.Order.SourceReference,
      CustomerId: aggregate.Order.CustomerId,
      CustomerSourceSystem: aggregate.Order.CustomerSourceSystem ?? aggregate.Order.SourceSystem,
      CustomerExternalReference: aggregate.Order.CustomerExternalReference,
      ShipToReference: aggregate.Order.ShipToReference,
      OwnerId: aggregate.Order.OwnerId,
      WarehouseId: aggregate.Order.WarehouseId,
      Priority: aggregate.Order.Priority,
      CutoffAt: aggregate.Order.CutoffAt,
      IdempotencyKey: aggregate.Order.ImportIdempotencyKey,
      Lines: aggregate.Lines.map((line) => ({
        LineNumber: line.LineNumber,
        SkuId: line.SkuId,
        UomId: line.UomId,
        OrderedQuantity: line.OrderedQuantity,
        ExternalLineReference: line.ExternalLineReference,
      })),
    };
  }

  private ImportFingerprintPayload(request: ImportOutboundOrderDto): Omit<ImportOutboundOrderDto, 'IdempotencyKey'> {
    const { IdempotencyKey: _idempotencyKey, ...payload } = request;
    void _idempotencyKey;
    return payload;
  }

  private MessageSuffixForOutbox(value: string): string {
    return this.Fingerprint('OutboundOutboxMessage', value).slice(0, 32);
  }

  private NormalizeImport(request: ImportOutboundOrderDto): ImportOutboundOrderDto {
    const lines = (request.Lines ?? []).map((line) => ({
      LineNumber: Number(line.LineNumber),
      SkuId: line.SkuId?.trim() ?? '',
      UomId: line.UomId?.trim() ?? '',
      OrderedQuantity: Number(line.OrderedQuantity),
      ExternalLineReference: line.ExternalLineReference?.trim() || null,
    }));
    const normalized: ImportOutboundOrderDto = {
      SourceSystem: request.SourceSystem?.trim() ?? '',
      SourceReference: request.SourceReference?.trim() ?? '',
      CustomerId: request.CustomerId?.trim() || null,
      CustomerSourceSystem: request.CustomerSourceSystem?.trim() || null,
      CustomerExternalReference: request.CustomerExternalReference?.trim() || null,
      ShipToReference: request.ShipToReference?.trim() || null,
      OwnerId: request.OwnerId?.trim() ?? '',
      WarehouseId: request.WarehouseId?.trim() ?? '',
      Priority: request.Priority === null || request.Priority === undefined ? null : Number(request.Priority),
      CutoffAt: this.NormalizeDateInput(request.CutoffAt),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
      Lines: lines,
    };
    if (!normalized.SourceSystem) throw new BusinessRuleException('SourceSystem is required');
    if (!normalized.SourceReference) throw new BusinessRuleException('SourceReference is required');
    if (!normalized.OwnerId) throw new BusinessRuleException('OwnerId is required');
    if (!normalized.WarehouseId) throw new BusinessRuleException('WarehouseId is required');
    if (this.BusinessReference(normalized).length > 120) {
      throw new BusinessRuleException('BusinessReference must not exceed 120 characters for outbound integration');
    }
    if (!normalized.CustomerId && !normalized.CustomerExternalReference) {
      throw new BusinessRuleException('CustomerId or CustomerExternalReference is required');
    }
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required');
    if (!lines.length) throw new BusinessRuleException('Outbound order requires at least one line');
    const seenLineNumbers = new Set<number>();
    for (const line of lines) {
      if (!Number.isInteger(line.LineNumber) || line.LineNumber < 1) {
        throw new BusinessRuleException('LineNumber must be a positive integer');
      }
      if (seenLineNumbers.has(line.LineNumber)) throw new BusinessRuleException('LineNumber must be unique');
      seenLineNumbers.add(line.LineNumber);
      if (!line.SkuId) throw new BusinessRuleException(`SkuId is required at line ${line.LineNumber}`);
      if (!line.UomId) throw new BusinessRuleException(`UomId is required at line ${line.LineNumber}`);
      if (!Number.isFinite(line.OrderedQuantity) || line.OrderedQuantity <= 0) {
        throw new BusinessRuleException(`OrderedQuantity must be positive at line ${line.LineNumber}`);
      }
    }
    return normalized;
  }

  private BusinessReference(request: ImportOutboundOrderDto): string {
    return `${request.SourceSystem}:OUTBOUND:${request.SourceReference}`;
  }

  private ValidationEvidence(errors: string[]): string[] {
    return errors.slice(0, 10).map((error, index) => `validation:${index + 1}:${error}`);
  }

  private AssertPageSize(pageSize?: number): void {
    if (pageSize !== undefined && Number(pageSize) > MAX_PAGE_SIZE) {
      throw new BusinessRuleException('PageSize must not be greater than 100');
    }
  }

  private NormalizeEvidence(evidenceRefs?: string[]): string[] {
    return (evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private NormalizeDateInput(value?: Date | string | null): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  }

  private NormalizeActionIdempotencyKey(idempotencyKey?: string): string {
    const normalized = idempotencyKey?.trim() ?? '';
    if (!normalized) throw new BusinessRuleException('IdempotencyKey is required for outbound order action');
    return normalized;
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
