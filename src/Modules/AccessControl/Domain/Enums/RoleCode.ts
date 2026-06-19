/**
 * Six core V0 roles (architecture 6.2). These are the canonical RBAC roles; the
 * legacy `users.role` varchar is bridged onto these via LegacyRoleBridge.
 */
export enum RoleCode {
  WmsAdmin = 'WMS_ADMIN',
  WarehouseSupervisor = 'WAREHOUSE_SUPERVISOR',
  WarehouseCoordinator = 'WAREHOUSE_COORDINATOR',
  Operator = 'OPERATOR',
  Qc = 'QC',
  InventoryAccountant = 'INVENTORY_ACCOUNTANT',
}
