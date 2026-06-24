import { createHash } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { DeadLetterActionDto, OutboxMessageDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

const DEFAULT_MAX_ATTEMPTS = 5;

export class ResolveDeadLetterUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(
    id: string,
    action: DeadLetterActionType,
    request: DeadLetterActionDto,
    context: AuditContext,
  ): Promise<OutboxMessageDto> {
    const current = await this.integrations.FindOutboxMessageById(id);
    if (!current) throw new NotFoundException('Integration dead-letter not found', { Id: id });

    const idempotencyKey = request.IdempotencyKey?.trim() || null;
    if (!request.ReasonCode?.trim()) {
      await this.AuditRejected(current, action, request, context, 'ReasonCode is required for dead-letter action');
      throw new BusinessRuleException('ReasonCode is required for dead-letter action');
    }

    const reasonCode = request.ReasonCode.trim().toUpperCase();
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.DeadLetterMessage,
    });
    const evidenceRefs = this.NormalizeEvidence(request.EvidenceRefs);
    const reasonNote = request.ReasonNote?.trim() || reasonCode;
    const actionPayloadHash = this.BuildActionPayloadHash(action, reasonCode, reasonNote, evidenceRefs, request);
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      await this.AuditRejected(
        current,
        action,
        { ...request, ReasonCode: reasonCode },
        context,
        'EvidenceRefs are required',
      );
      throw new BusinessRuleException('EvidenceRefs are required for dead-letter action');
    }

    if (idempotencyKey && current.ActionIdempotencyKey === idempotencyKey && current.ResolutionAction === action) {
      if (current.ActionPayloadHash === actionPayloadHash) {
        return IntegrationDtoMapper.ToOutboxMessageDto(current, true);
      }
      await this.AuditRejected(
        current,
        action,
        { ...request, ReasonCode: reasonCode, EvidenceRefs: evidenceRefs },
        context,
        'Idempotency key was reused with a different action payload',
      );
      throw new ConflictException('Idempotency key was reused with a different action payload');
    }

    if (current.Status !== OutboxMessageStatus.DeadLetter) {
      await this.AuditRejected(
        current,
        action,
        request,
        context,
        `Dead-letter action is not allowed from ${current.Status}`,
      );
      throw new BusinessRuleException(`Dead-letter action is not allowed from ${current.Status}`);
    }

    return await this.audited.Run(async (manager) => {
      const locked = await this.integrations.FindOutboxMessageById(id, manager, { Lock: true });
      if (!locked) throw new NotFoundException('Integration dead-letter not found', { Id: id });
      if (idempotencyKey && locked.ActionIdempotencyKey === idempotencyKey && locked.ResolutionAction === action) {
        if (locked.ActionPayloadHash !== actionPayloadHash) {
          throw new ConflictException('Idempotency key was reused with a different action payload');
        }
        const duplicate = IntegrationDtoMapper.ToOutboxMessageDto(locked, true);
        return {
          result: duplicate,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.DeadLetterMessage,
            ObjectId: locked.Id,
            ObjectCode: locked.MessageId,
            BeforeJson: duplicate as unknown as Record<string, unknown>,
            AfterJson: duplicate as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: reasonNote,
            EvidenceRefs: evidenceRefs,
            WarehouseId: locked.WarehouseContext,
            OwnerId: locked.OwnerContext,
            ReferenceType: action,
            ReferenceId: locked.Id,
            Result: AuditResult.Success,
          }),
        };
      }
      if (locked.Status !== OutboxMessageStatus.DeadLetter) {
        throw new ConflictException(`Dead-letter action state changed to ${locked.Status}`);
      }

      const now = new Date();
      const updated = new OutboxMessageEntity({
        ...locked,
        Status: this.StatusForAction(action),
        AttemptCount: action === DeadLetterActionType.Retry ? 0 : locked.AttemptCount,
        MaxAttempts: action === DeadLetterActionType.Retry ? DEFAULT_MAX_ATTEMPTS : locked.MaxAttempts,
        NextRetryAt: null,
        FailureCategory: action === DeadLetterActionType.Retry ? null : locked.FailureCategory,
        ResolutionAction: action,
        ActionIdempotencyKey: idempotencyKey,
        ActionPayloadHash: actionPayloadHash,
        ResolvedAt: now,
        ResolvedBy: context.ActorUserId,
        ReasonCode: reasonCode,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: reasonNote,
        EvidenceRefs: evidenceRefs,
        Payload:
          action === DeadLetterActionType.ManualFix
            ? { ...locked.Payload, ManualFixPayload: request.ManualFixPayload ?? null }
            : locked.Payload,
        UpdatedAt: now,
      });
      const saved = await this.integrations.UpdateOutboxMessage(updated, manager);
      const result = IntegrationDtoMapper.ToOutboxMessageDto(saved);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.DeadLetterMessage,
          ObjectId: saved.Id,
          ObjectCode: saved.MessageId,
          BeforeJson: IntegrationDtoMapper.ToOutboxMessageDto(locked) as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: updated.ReasonNote,
          EvidenceRefs: evidenceRefs,
          WarehouseId: saved.WarehouseContext,
          OwnerId: saved.OwnerContext,
          ReferenceType: action,
          ReferenceId: saved.Id,
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private async AuditRejected(
    current: OutboxMessageEntity,
    action: DeadLetterActionType,
    request: Partial<DeadLetterActionDto>,
    context: AuditContext,
    reason: string,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.DeadLetterMessage,
        ObjectId: current.Id,
        ObjectCode: current.MessageId,
        BeforeJson: IntegrationDtoMapper.ToOutboxMessageDto(current) as unknown as Record<string, unknown>,
        AfterJson: { BlockedReason: reason, Action: action },
        ReasonCodeId: null,
        ReasonNote: request.ReasonNote ?? request.ReasonCode ?? null,
        EvidenceRefs: request.EvidenceRefs ?? null,
        WarehouseId: current.WarehouseContext,
        OwnerId: current.OwnerContext,
        ReferenceType: action,
        ReferenceId: current.Id,
        Result: AuditResult.Failed,
      }),
    }));
  }

  private NormalizeEvidence(evidenceRefs: string[] | undefined): string[] {
    return [...new Set((evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean))];
  }

  private BuildActionPayloadHash(
    action: DeadLetterActionType,
    reasonCode: string,
    reasonNote: string,
    evidenceRefs: string[],
    request: DeadLetterActionDto,
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify(
          this.SortJson({
            Action: action,
            ReasonCode: reasonCode,
            ReasonNote: reasonNote,
            EvidenceRefs: evidenceRefs,
            ManualFixPayload: request.ManualFixPayload ?? null,
          }),
        ),
      )
      .digest('hex');
  }

  private SortJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.SortJson(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.SortJson(item)]),
      );
    }
    return value;
  }

  private StatusForAction(action: DeadLetterActionType): OutboxMessageStatus {
    switch (action) {
      case DeadLetterActionType.Retry:
        return OutboxMessageStatus.Pending;
      case DeadLetterActionType.ManualFix:
        return OutboxMessageStatus.ManualFixed;
      case DeadLetterActionType.Acknowledge:
        return OutboxMessageStatus.Acknowledged;
      case DeadLetterActionType.Ignore:
        return OutboxMessageStatus.Ignored;
      default:
        throw new BusinessRuleException(`Unsupported dead-letter action: ${action}`);
    }
  }
}
