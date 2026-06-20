/**
 * Doc-09 terminal outcomes preserved without deleting the case (architecture 6.8). An
 * exception is never deleted; cancel/duplicate are recorded as an outcome (still audited).
 */
export enum ExceptionOutcome {
  AutoClosed = 'AUTO_CLOSED',
  Cancelled = 'CANCELLED',
  Duplicate = 'DUPLICATE',
}
