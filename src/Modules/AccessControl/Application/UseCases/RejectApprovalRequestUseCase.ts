import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { DecideApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/DecideApprovalRequestUseCase';

/** Rejects a PENDING request: PENDING -> REJECTED (architecture 6.7). See base for guards. */
export class RejectApprovalRequestUseCase extends DecideApprovalRequestUseCase {
  protected readonly TargetDecision = ApprovalDecision.Rejected;
}
