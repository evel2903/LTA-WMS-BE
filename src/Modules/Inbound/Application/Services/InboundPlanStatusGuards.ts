import { BusinessRuleException } from '@common/Exceptions/AppException';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

// Re-review fix (P1): none of the operational use cases (gate-in, receiving, QC, LPN,
// discrepancy, release, readiness) ever read Plan.Status -- this codebase deliberately
// decided NOT to block them on Draft (see the story's own open-question decision), but
// that silence also left Cancelled completely unguarded, letting an operator record
// gate-in/receiving/QC/etc against a plan that was explicitly voided. Cancelled is
// terminal and one-way (only reachable from Draft via CancelInboundPlanUseCase's own
// Draft-only guard), so this is a pure exclusion, not a broader status allow-list.
export function AssertInboundPlanNotCancelled(status: InboundPlanDocumentStatus): void {
  if (status === InboundPlanDocumentStatus.Cancelled) {
    throw new BusinessRuleException('Phiếu nhập kho đã bị hủy, không thể thao tác tiếp.');
  }
}
