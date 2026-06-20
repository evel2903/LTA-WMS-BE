import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { DecideApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/DecideApprovalRequestUseCase';

/** Approves a PENDING request: PENDING -> APPROVED (architecture 6.7). See base for guards. */
export class ApproveApprovalRequestUseCase extends DecideApprovalRequestUseCase {
  protected readonly TargetDecision = ApprovalDecision.Approved;
}
