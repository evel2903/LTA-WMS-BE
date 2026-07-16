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
import { ConfirmInboundLpnDto, InboundLpnDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { AssertInboundPlanNotCancelled } from '@modules/Inbound/Application/Services/InboundPlanStatusGuards';
import { InboundLpnEntity } from '@modules/Inbound/Domain/Entities/InboundLpnEntity';

const LPN_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._:-]{2,79}$/;
const SSCC_CODE_PATTERN = /^[0-9]{18}$/;

export class ConfirmInboundLpnUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ConfirmInboundLpnDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundLpnDto> {
    const normalized = this.NormalizeAndAssert(request);
    const receipt = await this.receiving.FindReceiptById(request.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found');
    const line = await this.receiving.FindReceiptLineById(request.ReceiptLineId);
    if (!line || line.ReceiptId !== receipt.Id) throw new BusinessRuleException('Receipt line not found for LPN');

    const duplicate = await this.receiving.FindInboundLpnByIdempotencyKey(line.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, normalized);
      return ReceivingDtoMapper.ToInboundLpnDto(duplicate, true);
    }

    await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, receipt);

    const aggregate = await this.inboundPlans.FindById(receipt.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for LPN');
    // Re-review fix (P1): the plan can be cancelled AFTER its receiving session/receipt
    // was legitimately started (Draft is allowed to receive; Cancel only requires Draft),
    // so this receipt-scoped use case must re-check the plan's CURRENT status itself --
    // it can't rely on StartReceivingSessionUseCase's own (transitive) readiness check.
    AssertInboundPlanNotCancelled(aggregate.Plan.Status);
    const planLine = aggregate.Lines.find((item) => item.Id === line.InboundPlanLineId);
    if (!planLine) throw new BusinessRuleException('Inbound plan line not found for LPN');

    const existing = await this.receiving.FindInboundLpnByScopeCode(
      receipt.WarehouseId,
      receipt.OwnerId,
      normalized.LpnCode,
    );
    if (existing && existing.ReceiptLineId !== line.Id) {
      throw new ConflictException('LPN already exists for warehouse and owner scope');
    }
    if (existing && existing.ReceiptLineId === line.Id) {
      throw new ConflictException('Receipt line already has this LPN with a different idempotency key');
    }

    const reasonCodeId = request.ReasonCode?.trim()
      ? (
          await this.reasonCatalog.ValidateReason({
            ReasonCode: request.ReasonCode,
            Action: ActionCode.Update,
            ObjectType: ObjectType.Receipt,
          })
        ).ReasonCodeId
      : null;
    const now = new Date();
    const lpn = new InboundLpnEntity({
      Id: randomUUID(),
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
      Quantity: request.Quantity ?? line.ActualQuantity,
      LpnCode: normalized.LpnCode,
      SsccCode: normalized.SsccCode,
      ReasonCode: request.ReasonCode?.trim() || null,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      IdempotencyKey: request.IdempotencyKey,
      ConfirmedAt: now,
      ConfirmedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.receiving.CreateInboundLpn(lpn, manager);
        const result = ReceivingDtoMapper.ToInboundLpnDto(created);
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
            ReferenceType: 'InboundLpn',
            ReferenceId: created.Id,
            WarehouseId: receipt.WarehouseId,
            OwnerId: receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.receiving.FindInboundLpnByIdempotencyKey(
          line.Id,
          request.IdempotencyKey,
        );
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, normalized);
          return ReceivingDtoMapper.ToInboundLpnDto(concurrentDuplicate, true);
        }
      }
      throw error;
    }
  }

  private NormalizeAndAssert(request: ConfirmInboundLpnDto): { LpnCode: string; SsccCode: string | null } {
    if (!request.ReceiptId?.trim()) throw new BusinessRuleException('Receipt is required for LPN confirmation');
    if (!request.ReceiptLineId?.trim())
      throw new BusinessRuleException('Receipt line is required for LPN confirmation');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('LPN idempotency key is required');
    const lpnCode = request.LpnCode?.trim().toUpperCase();
    if (!lpnCode || !LPN_CODE_PATTERN.test(lpnCode)) {
      throw new BusinessRuleException('LPN code format is invalid');
    }
    const ssccCode = request.SsccCode?.trim() || null;
    if (ssccCode && !SSCC_CODE_PATTERN.test(ssccCode)) throw new BusinessRuleException('SSCC code format is invalid');
    if (request.Quantity !== undefined && request.Quantity !== null && request.Quantity <= 0) {
      throw new BusinessRuleException('LPN quantity must be positive');
    }
    return { LpnCode: lpnCode, SsccCode: ssccCode };
  }

  private AssertDuplicateMatchesRequest(
    duplicate: InboundLpnEntity,
    request: { LpnCode: string; SsccCode: string | null },
  ): void {
    if (duplicate.LpnCode !== request.LpnCode || duplicate.SsccCode !== request.SsccCode) {
      throw new ConflictException('LPN idempotency key already used for a different LPN');
    }
  }
}
