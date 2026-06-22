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
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StartReceivingSessionDto, ReceivingSessionDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';

export class StartReceivingSessionUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly readiness: ValidateReceivingReadinessUseCase,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: StartReceivingSessionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ReceivingSessionDto> {
    const aggregate = await this.inboundPlans.FindById(request.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found');

    const readiness = await this.readiness.Execute(
      {
        Id: request.InboundPlanId,
        AttemptOverride: request.AttemptOverride,
        ReasonCode: request.ReasonCode,
        ReasonNote: request.ReasonNote,
        EvidenceRefs: request.EvidenceRefs,
      },
      context,
    );
    if (!readiness.Allowed) throw new BusinessRuleException(readiness.Reason);

    const sessionKey = this.SessionKey(request, context.ActorUserId);
    const existingSession = await this.receiving.FindOpenSessionByPlanAndKey(request.InboundPlanId, sessionKey);
    if (existingSession) {
      return ReceivingDtoMapper.ToSessionDto(existingSession.Session, existingSession.Receipt, true);
    }

    const now = new Date();
    const existingReceipt = await this.receiving.FindReceiptByInboundPlanId(request.InboundPlanId);
    const receipt =
      existingReceipt ??
      new ReceiptEntity({
        Id: randomUUID(),
        InboundPlanId: aggregate.Plan.Id,
        ReceiptNumber: `${aggregate.Plan.SourceDocumentNumber}-RCPT`,
        BusinessReference: `${aggregate.Plan.BusinessReference}:RCPT`,
        OwnerId: aggregate.Plan.OwnerId,
        OwnerCode: aggregate.Plan.OwnerCode,
        WarehouseId: aggregate.Plan.WarehouseId,
        WarehouseCode: aggregate.Plan.WarehouseCode,
        CoreFlowInstanceId: aggregate.Plan.CoreFlowInstanceId,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: context.ActorUserId,
      });

    await AssertReceiptPermission(
      this.permissionChecker,
      context.ActorUserId,
      existingReceipt ? ActionCode.Update : ActionCode.Create,
      receipt,
    );

    const session = new ReceivingSessionEntity({
      Id: randomUUID(),
      InboundPlanId: aggregate.Plan.Id,
      ReceiptId: receipt.Id,
      SessionKey: sessionKey,
      DeviceCode: request.DeviceCode ?? null,
      OwnerId: aggregate.Plan.OwnerId,
      OwnerCode: aggregate.Plan.OwnerCode,
      WarehouseId: aggregate.Plan.WarehouseId,
      WarehouseCode: aggregate.Plan.WarehouseCode,
      StartedAt: now,
      CreatedAt: now,
      UpdatedAt: now,
      StartedBy: context.ActorUserId,
    });

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.receiving.CreateSessionWithReceipt(session, receipt, manager);
        const result = ReceivingDtoMapper.ToSessionDto(created.Session, created.Receipt, false);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: existingReceipt ? ActionCode.Update : ActionCode.Create,
            ObjectType: ObjectType.Receipt,
            ObjectId: created.Receipt.Id,
            ObjectCode: created.Receipt.ReceiptNumber,
            AfterJson: result as unknown as Record<string, unknown>,
            ReferenceType: 'ReceivingSession',
            ReferenceId: created.Session.Id,
            WarehouseId: created.Receipt.WarehouseId,
            OwnerId: created.Receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const duplicate = await this.receiving.FindOpenSessionByPlanAndKey(request.InboundPlanId, sessionKey);
        if (duplicate) return ReceivingDtoMapper.ToSessionDto(duplicate.Session, duplicate.Receipt, true);
      }
      throw error;
    }
  }

  private SessionKey(request: StartReceivingSessionDto, actorUserId?: string | null): string {
    const key = request.SessionKey?.trim();
    if (key) return key;
    return `${actorUserId ?? 'system'}:${request.DeviceCode?.trim() || 'default-device'}`;
  }
}
