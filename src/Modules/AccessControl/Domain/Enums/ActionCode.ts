/**
 * Nine standard V0 actions (architecture 6.3 / FR-16). `Delete/Cancel` is
 * normalized to the single token `DeleteCancel`.
 */
export enum ActionCode {
  Create = 'Create',
  Read = 'Read',
  Update = 'Update',
  DeleteCancel = 'DeleteCancel',
  Approve = 'Approve',
  Override = 'Override',
  Unlock = 'Unlock',
  Reprint = 'Reprint',
  Adjust = 'Adjust',
}
