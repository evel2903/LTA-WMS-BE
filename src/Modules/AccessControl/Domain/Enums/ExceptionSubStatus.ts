/**
 * Doc-09 secondary states preserved without expanding the 6 core states (architecture 6.8).
 * Stored on the case so V0 keeps the doc-09 semantics; no extra transitions in V0.
 */
export enum ExceptionSubStatus {
  AutoBlocked = 'AUTO_BLOCKED',
  Rejected = 'REJECTED',
  Reassigned = 'REASSIGNED',
  Escalated = 'ESCALATED',
  Rework = 'REWORK',
}
