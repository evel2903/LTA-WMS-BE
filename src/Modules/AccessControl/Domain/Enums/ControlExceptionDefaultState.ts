/**
 * C8 default state a control exception lands in when detected (doc 09). C9 uses this
 * as the initial state hint for the exception 6-state lifecycle.
 */
export enum ControlExceptionDefaultState {
  Blocked = 'BLOCKED',
  Escalated = 'ESCALATED',
  Warned = 'WARNED',
  Detected = 'DETECTED',
}
