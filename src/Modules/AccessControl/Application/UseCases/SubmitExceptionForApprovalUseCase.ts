import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { SubmitExceptionForApprovalDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { TransitionExceptionUseCase } from '@modules/AccessControl/Application/UseCases/TransitionExceptionUseCase';

/**
 * ASSIGNED -> IN_REVIEW_PENDING_APPROVAL (architecture 6.8). Requires an actor. Approval is
 * policy-driven (story C9 Open Question resolution): an approval request is created when the
 * caller requests it (`RequireApproval`) OR the C8 catalog entry for the exception type has
 * `ApprovalRequired`. When created, the C6 CreateApprovalRequestUseCase (Action=Approve,
 * TargetObjectType=ExceptionCase, TargetObjectId=case) runs and the returned ApprovalRequestId
 * is stored on the case so Resolve can require an APPROVED decision. If no approval is needed,
 * IN_REVIEW -> RESOLVED only requires reason/evidence (approval is NOT forced by default).
 */
export class SubmitExceptionForApprovalUseCase extends TransitionExceptionUseCase<SubmitExceptionForApprovalDto> {
  protected readonly TargetState = ExceptionState.InReviewPendingApproval;

  constructor(
    cases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly createApprovalRequest: CreateApprovalRequestUseCase,
    auditedTransaction?: AuditedTransaction,
  ) {
    super(cases, auditedTransaction);
  }

  protected async ApplyTransition(
    target: ExceptionCaseEntity,
    request: SubmitExceptionForApprovalDto,
    context: AuditContext,
  ): Promise<void> {
    if (!context.ActorUserId) {
      throw new ForbiddenAppException('Access denied (PERMISSION_DENIED)', { Reason: 'PERMISSION_DENIED' });
    }

    const catalogEntry = await this.controlExceptionCatalog.ValidateExceptionType(target.ExceptionType);
    const approvalNeeded = request.RequireApproval === true || catalogEntry.ApprovalRequired;
    if (!approvalNeeded) {
      return;
    }

    const approval = await this.createApprovalRequest.Execute(
      {
        Action: ActionCode.Approve,
        TargetObjectType: ObjectType.ExceptionCase,
        TargetObjectId: target.Id,
        TargetObjectCode: target.ExceptionType,
        ReasonCode: request.ReasonCode ?? null,
        ReasonNote: request.ReasonNote ?? null,
        ReferenceType: target.ReferenceType,
        ReferenceId: target.ReferenceId,
      },
      context,
    );
    target.ApprovalRequestId = approval.Id;
  }
}
