/**
 * Lifecycle of an approval request (architecture 6.7). V0 is a simple state set:
 * a PENDING request is decided exactly once into APPROVED or REJECTED. SLA/escalation
 * and multi-step approval are deferred to V2+.
 */
export enum ApprovalDecision {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}
