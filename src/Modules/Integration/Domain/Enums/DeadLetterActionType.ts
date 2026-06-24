export enum DeadLetterActionType {
  Retry = 'Retry',
  ManualFix = 'ManualFix',
  Acknowledge = 'Acknowledge',
  Ignore = 'Ignore',
}
