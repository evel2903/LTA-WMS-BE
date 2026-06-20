import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { CloseExceptionDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { TransitionExceptionUseCase } from '@modules/AccessControl/Application/UseCases/TransitionExceptionUseCase';

/**
 * RESOLVED -> CLOSED (architecture 6.8 / AC4). Re-checks (CTRL-EX-04 "closure" control) that
 * nothing is still missing before final close: if the catalog requires evidence the case must
 * carry it, and if an approval request is linked it must be APPROVED. Records ClosedAt; the
 * update + Update audit row commit in one transaction.
 */
export class CloseExceptionUseCase extends TransitionExceptionUseCase<CloseExceptionDto> {
  protected readonly TargetState = ExceptionState.Closed;

  constructor(
    cases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly approvalRequests: IApprovalRequestRepository,
    auditedTransaction?: AuditedTransaction,
  ) {
    super(cases, auditedTransaction);
  }

  protected async ApplyTransition(target: ExceptionCaseEntity): Promise<void> {
    // Tolerant catalog lookup (don't trap a case whose type later became DeferredV1Plus/removed).
    const catalogEntry = await this.controlExceptionCatalog.FindByCode(target.ExceptionType);
    const evidenceRequired = catalogEntry?.EvidenceRequired ?? false;
    const approvalRequired = catalogEntry?.ApprovalRequired ?? false;

    if (evidenceRequired && !target.HasEvidence()) {
      throw new BusinessRuleException('Close blocked: evidence is required and missing for this exception type');
    }

    if (approvalRequired || target.ApprovalRequestId) {
      if (!target.ApprovalRequestId) {
        throw new BusinessRuleException('Close blocked: this exception type requires an approved approval request');
      }
      const approval = await this.approvalRequests.FindById(target.ApprovalRequestId);
      const approved =
        approval !== null &&
        approval.Decision === ApprovalDecision.Approved &&
        approval.Action === ActionCode.Approve &&
        approval.TargetObjectType === ObjectType.ExceptionCase &&
        approval.TargetObjectId === target.Id;
      if (!approved) {
        throw new BusinessRuleException('Close blocked: no APPROVED approval request matching this case');
      }
    }

    target.ClosedAt = new Date();
  }
}
