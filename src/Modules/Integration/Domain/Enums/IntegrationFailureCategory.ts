export enum IntegrationFailureCategory {
  Transient = 'Transient',
  Validation = 'Validation',
  Permanent = 'Permanent',
  DuplicateConflict = 'DuplicateConflict',
  RetryExhausted = 'RetryExhausted',
}
