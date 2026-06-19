/**
 * Data scope dimensions (architecture 6.1). C1 only persists the schema; runtime
 * resolution/enforcement is C2.
 */
export enum DataScopeType {
  Warehouse = 'WAREHOUSE',
  Zone = 'ZONE',
  Owner = 'OWNER',
  Customer = 'CUSTOMER',
}
