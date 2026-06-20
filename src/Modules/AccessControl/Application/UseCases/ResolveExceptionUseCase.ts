import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ResolveExceptionDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { TransitionExceptionUseCase } from '@modules/AccessControl/Application/UseCases/TransitionExceptionUseCase';

/**
 * IN_REVIEW_PENDING_APPROVAL -> RESOLVED (architecture 6.8 / AC4). Blocks unless the C8 catalog
 * requirements are satisfied:
 *  - ReasonRequired -> a reason MUST be supplied and is validated against the catalog for
 *    (Update, ExceptionCase) — the seed-satisfiable pair (RC-EXC-RESOLVE), NOT a pair no entry
 *    can ever satisfy (C6/C8 lesson).
 *  - EvidenceRequired -> the case MUST carry evidence (existing or supplied here).
 *  - ApprovalRequestId present -> the linked approval request MUST be APPROVED.
 * On success records ResolvedAt + ResolutionNote; the update + Update audit row commit in one tx.
 */
export class ResolveExceptionUseCase extends TransitionExceptionUseCase<ResolveExceptionDto> {
  protected readonly TargetState = ExceptionState.Resolved;

  constructor(
    cases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly approvalRequests: IApprovalRequestRepository,
    auditedTransaction?: AuditedTransaction,
  ) {
    super(cases, auditedTransaction);
  }

  protected async ApplyTransition(target: ExceptionCaseEntity, request: ResolveExceptionDto): Promise<void> {
    // Use FindByCode (tolerant) not ValidateExceptionType: a case validly created earlier must stay
    // resolvable even if its type was later flipped to DeferredV1Plus/removed (don't trap the case).
    const catalogEntry = await this.controlExceptionCatalog.FindByCode(target.ExceptionType);
    const reasonRequired = catalogEntry?.ReasonRequired ?? false;
    const evidenceRequired = catalogEntry?.EvidenceRequired ?? false;
    const approvalRequired = catalogEntry?.ApprovalRequired ?? false;

    // Merge any evidence supplied at resolve onto the case.
    if (request.EvidenceRefs && request.EvidenceRefs.length > 0) {
      target.EvidenceRefs = request.EvidenceRefs;
    }

    // Reason guard (validated against the seed-satisfiable (Update, ExceptionCase) pair).
    if (reasonRequired) {
      if (!request.ReasonCode) {
        throw new BusinessRuleException('Resolve requires a reason for this exception type');
      }
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Update,
        ObjectType: ObjectType.ExceptionCase,
      });
      target.ReasonCodeId = validated.ReasonCodeId;
    } else if (request.ReasonCode) {
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Update,
        ObjectType: ObjectType.ExceptionCase,
      });
      target.ReasonCodeId = validated.ReasonCodeId;
    }

    // Evidence guard.
    if (evidenceRequired && !target.HasEvidence()) {
      throw new BusinessRuleException('Resolve requires evidence for this exception type');
    }

    // Approval guard: when the catalog requires approval OR one is linked, a matching APPROVED request
    // for THIS case must exist — match decision + action + target, not the id alone (C7 lesson).
    if (approvalRequired || target.ApprovalRequestId) {
      if (!target.ApprovalRequestId) {
        throw new BusinessRuleException('Resolve blocked: this exception type requires an approved approval request');
      }
      const approval = await this.approvalRequests.FindById(target.ApprovalRequestId);
      const approved =
        approval !== null &&
        approval.Decision === ApprovalDecision.Approved &&
        approval.Action === ActionCode.Approve &&
        approval.TargetObjectType === ObjectType.ExceptionCase &&
        approval.TargetObjectId === target.Id;
      if (!approved) {
        throw new BusinessRuleException('Resolve blocked: no APPROVED approval request matching this case');
      }
    }

    target.ResolutionNote = request.ResolutionNote ?? null;
    target.ResolvedAt = new Date();
  }
}
