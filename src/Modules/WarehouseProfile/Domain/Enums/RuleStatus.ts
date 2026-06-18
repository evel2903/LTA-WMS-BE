/**
 * Rule lifecycle status. Chosen symmetric with WarehouseProfileStatus (DRAFT/ACTIVE/RETIRED).
 * B2 only stores it; activation lifecycle is B5.
 */
export enum RuleStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  Retired = 'RETIRED',
}
