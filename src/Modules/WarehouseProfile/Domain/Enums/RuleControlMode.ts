/**
 * Control mode stored as data in B2. Control-mode resolution / RuleDecision is B4.
 */
export enum RuleControlMode {
  HardBlock = 'HARD_BLOCK',
  ApprovalRequired = 'APPROVAL_REQUIRED',
  SoftWarning = 'SOFT_WARNING',
  AutoSuggestion = 'AUTO_SUGGESTION',
}
