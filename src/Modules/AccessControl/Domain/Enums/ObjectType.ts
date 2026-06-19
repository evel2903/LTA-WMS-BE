/**
 * V0 permission objects (architecture 6.3). Objects owned by later C stories
 * (ReasonCode/ApprovalRequest/OverrideLog/AuditLog/ExceptionCase) are present in
 * the catalog so the permission matrix is complete; their business tables ship
 * in C3-C9.
 */
export enum ObjectType {
  Site = 'Site',
  Warehouse = 'Warehouse',
  Zone = 'Zone',
  Location = 'Location',
  LocationProfile = 'LocationProfile',
  Owner = 'Owner',
  Sku = 'SKU',
  Uom = 'UOM',
  ItemCoverage = 'ItemCoverage',
  InventoryStatus = 'InventoryStatus',
  WarehouseProfile = 'WarehouseProfile',
  Rule = 'Rule',
  Role = 'Role',
  Permission = 'Permission',
  UserAssignment = 'UserAssignment',
  ReasonCode = 'ReasonCode',
  ApprovalRequest = 'ApprovalRequest',
  OverrideLog = 'OverrideLog',
  AuditLog = 'AuditLog',
  ExceptionCase = 'ExceptionCase',
}
