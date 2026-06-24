export enum OutboxMessageStatus {
  Pending = 'Pending',
  Retrying = 'Retrying',
  Dispatched = 'Dispatched',
  Failed = 'Failed',
  DeadLetter = 'DeadLetter',
  ManualFixed = 'ManualFixed',
  Acknowledged = 'Acknowledged',
  Ignored = 'Ignored',
}
