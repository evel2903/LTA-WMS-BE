/**
 * Exception lifecycle 6 core states (architecture 6.8 / story C9). V0 keeps exactly the
 * six PRD states; doc-09 branches (auto-blocked/rejected/reassigned/escalated/rework and
 * auto-closed/cancelled/duplicate) are carried as `sub_status`/`outcome`, not extra states.
 */
export enum ExceptionState {
  Detected = 'DETECTED',
  Logged = 'LOGGED',
  Assigned = 'ASSIGNED',
  InReviewPendingApproval = 'IN_REVIEW_PENDING_APPROVAL',
  Resolved = 'RESOLVED',
  Closed = 'CLOSED',
}
