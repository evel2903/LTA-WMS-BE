import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  CreateApprovalRequestDto,
  ApprovalRequestDto,
} from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { ApprovalRequestDtoMapper } from '@modules/AccessControl/Application/Mappers/ApprovalRequestDtoMapper';

/**
 * Creates a PENDING approval request for an APPROVAL_REQUIRED action (architecture 6.7).
 * Guards that a valid approver exists for `(Approve, ApprovalRequest)` (AC2) so a request
 * is never created for an action no one can ever approve. The request reason (when given)
 * is validated against the catalog for `(Create, ApprovalRequest)`. The create + its
 * Create audit row commit in one transaction (AC5).
 */
export class CreateApprovalRequestUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly approverDirectory: ApproverDirectory,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateApprovalRequestDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ApprovalRequestDto> {
    const requesterUserId = context.ActorUserId;
    if (!requesterUserId) {
      throw new BusinessRuleException('Approval request requires an authenticated requester');
    }

    const hasApprover = await this.approverDirectory.HasApprover();
    if (!hasApprover) {
      throw new BusinessRuleException('No valid approver for this action/scope');
    }

    let requestReasonCodeId: string | null = null;
    if (request.ReasonCode) {
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Create,
        ObjectType: ObjectType.ApprovalRequest,
      });
      requestReasonCodeId = validated.ReasonCodeId;
    }

    const now = new Date();
    const entity = new ApprovalRequestEntity({
      Id: randomUUID(),
      RequesterUserId: requesterUserId,
      Action: request.Action,
      TargetObjectType: request.TargetObjectType,
      TargetObjectId: request.TargetObjectId,
      TargetObjectCode: request.TargetObjectCode ?? null,
      Scope: request.Scope ?? null,
      RequestReasonCodeId: requestReasonCodeId,
      RequestReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? null,
      Decision: ApprovalDecision.Pending,
      ReferenceType: request.ReferenceType ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CorrelationId: context.CorrelationId,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: requesterUserId,
    });

    const buildEntry = (created: ApprovalRequestEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.ApprovalRequest,
        ObjectId: created.Id,
        ObjectCode: created.TargetObjectCode,
        AfterJson: ApprovalRequestDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: created.RequestReasonCodeId,
        ReasonNote: created.RequestReasonNote,
        EvidenceRefs: created.EvidenceRefs,
        ReferenceType: created.ReferenceType,
        ReferenceId: created.ReferenceId,
        ScopeJson: created.Scope,
      });

    if (!this.auditedTransaction) {
      const created = await this.approvalRequests.Create(entity);
      return ApprovalRequestDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.approvalRequests.Create(entity, manager);
      return { result: ApprovalRequestDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
