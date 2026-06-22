import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';

/**
 * Canonical V0 RBAC catalog (architecture 6.2 / 6.3). Single source of truth for
 * the idempotent seed: six core roles, the role→permission matrix, and the
 * derived permission catalog.
 *
 * Grain note: grants are COARSE-GRAINED `(action, object)` pairs. The matrix's
 * "scoped/own/all" qualifiers in architecture 6.3 are data-scope concerns layered
 * by C2 (the `data_scopes` table), NOT encoded here. See story C1 Open Questions.
 */

export interface RoleCatalogEntry {
  Code: RoleCode;
  Name: string;
  Description: string;
}

export interface RolePermissionGrant {
  Role: RoleCode;
  Action: ActionCode;
  ObjectType: ObjectType;
}

export interface PermissionCatalogEntry {
  Action: ActionCode;
  ObjectType: ObjectType;
}

export const ROLE_CATALOG: ReadonlyArray<RoleCatalogEntry> = [
  {
    Code: RoleCode.WmsAdmin,
    Name: 'WMS Admin',
    Description: 'Quản lý config, role, permission, reason, profile/rule.',
  },
  {
    Code: RoleCode.WarehouseSupervisor,
    Name: 'Giám sát kho',
    Description: 'Duyệt exception/override/adjustment/reprint theo scope.',
  },
  {
    Code: RoleCode.WarehouseCoordinator,
    Name: 'Điều phối kho',
    Description: 'Điều phối task/control object V1+, V0 chủ yếu read/request.',
  },
  { Code: RoleCode.Operator, Name: 'Nhân viên vận hành', Description: 'Thực hiện task trong V1+, V0 read hạn chế.' },
  { Code: RoleCode.Qc, Name: 'QC', Description: 'Xử lý QC evidence/disposition khi module tương ứng bật.' },
  {
    Code: RoleCode.InventoryAccountant,
    Name: 'Kế toán kho',
    Description: 'Duyệt/đối chiếu thay đổi tài chính và audit.',
  },
];

// --- Object groups (architecture 6.3 matrix rows) ---
const MASTER_LOCATION: ObjectType[] = [
  ObjectType.Site,
  ObjectType.Warehouse,
  ObjectType.Zone,
  ObjectType.Location,
  ObjectType.LocationProfile,
];
const SKU_OWNER: ObjectType[] = [
  ObjectType.Owner,
  ObjectType.Sku,
  ObjectType.Uom,
  ObjectType.ItemCoverage,
  ObjectType.InventoryStatus,
];
const PROFILE_RULE: ObjectType[] = [ObjectType.WarehouseProfile, ObjectType.Rule];
const ACCESS: ObjectType[] = [ObjectType.Role, ObjectType.Permission, ObjectType.UserAssignment];
const V1_FOUNDATION: ObjectType[] = [
  ObjectType.Partner,
  ObjectType.MobileTask,
  ObjectType.LabelTemplate,
  ObjectType.PrintJob,
  ObjectType.IntegrationMessage,
  ObjectType.DeadLetterMessage,
  ObjectType.ReconciliationRun,
];
const V1_INBOUND: ObjectType[] = [
  ObjectType.InboundPlan,
  ObjectType.Receipt,
  ObjectType.QcTask,
  ObjectType.PutawayTask,
];
const V1_INVENTORY: ObjectType[] = [ObjectType.InventoryMovement, ObjectType.CycleCount, ObjectType.ReplenishmentTask];
const V1_OUTBOUND: ObjectType[] = [
  ObjectType.OutboundOrder,
  ObjectType.Allocation,
  ObjectType.PickTask,
  ObjectType.Package,
  ObjectType.Shipment,
  ObjectType.Load,
  ObjectType.GoodsIssue,
];
const V1_OPERATIONAL: ObjectType[] = [...V1_FOUNDATION, ...V1_INBOUND, ...V1_INVENTORY, ...V1_OUTBOUND];
const V1_TASKS: ObjectType[] = [
  ObjectType.QcTask,
  ObjectType.PutawayTask,
  ObjectType.ReplenishmentTask,
  ObjectType.PickTask,
  ObjectType.MobileTask,
];
const V1_LABELS: ObjectType[] = [ObjectType.LabelTemplate, ObjectType.PrintJob];

const grant = (role: RoleCode, action: ActionCode, objects: ObjectType[]): RolePermissionGrant[] =>
  objects.map((objectType) => ({ Role: role, Action: action, ObjectType: objectType }));

const grantActions = (role: RoleCode, actions: ActionCode[], objects: ObjectType[]): RolePermissionGrant[] =>
  actions.flatMap((action) => grant(role, action, objects));

const ADMIN_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.WmsAdmin, ActionCode.Create, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ...ACCESS,
    ObjectType.ReasonCode,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ...ACCESS,
    ObjectType.ReasonCode,
    ObjectType.ApprovalRequest,
    ObjectType.OverrideLog,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Update, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ...ACCESS,
    ObjectType.ReasonCode,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WmsAdmin, ActionCode.DeleteCancel, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...ACCESS,
    ObjectType.ReasonCode,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Approve, [
    ObjectType.WarehouseProfile,
    ObjectType.ApprovalRequest,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Override, [ObjectType.OverrideLog, ObjectType.Rule]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Unlock, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Reprint, [ObjectType.Location]),
  ...grant(RoleCode.WmsAdmin, ActionCode.Adjust, [ObjectType.InventoryStatus]),
  ...grantActions(RoleCode.WmsAdmin, Object.values(ActionCode), V1_OPERATIONAL),
];

const SUPERVISOR_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ObjectType.ReasonCode,
    ObjectType.ApprovalRequest,
    ObjectType.OverrideLog,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Approve, [
    ObjectType.WarehouseProfile,
    ObjectType.ApprovalRequest,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Override, [ObjectType.OverrideLog]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Create, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Update, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Reprint, [ObjectType.Location]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Adjust, [ObjectType.InventoryStatus]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Read, V1_OPERATIONAL),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Create, [
    ObjectType.QcTask,
    ObjectType.InventoryMovement,
    ObjectType.CycleCount,
    ObjectType.ReconciliationRun,
    ObjectType.DeadLetterMessage,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Update, [
    ...V1_TASKS,
    ObjectType.Receipt,
    ObjectType.InventoryMovement,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.CycleCount,
    ObjectType.GoodsIssue,
    ObjectType.ReconciliationRun,
    ObjectType.DeadLetterMessage,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.DeleteCancel, [
    ObjectType.InboundPlan,
    ObjectType.Receipt,
    ObjectType.OutboundOrder,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.GoodsIssue,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Approve, [
    ObjectType.QcTask,
    ObjectType.CycleCount,
    ObjectType.GoodsIssue,
    ObjectType.ReconciliationRun,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Override, [
    ObjectType.Allocation,
    ObjectType.PutawayTask,
    ObjectType.PickTask,
    ObjectType.GoodsIssue,
    ObjectType.IntegrationMessage,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Unlock, [ObjectType.CycleCount, ObjectType.DeadLetterMessage]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Reprint, [
    ObjectType.PrintJob,
    ObjectType.Package,
    ObjectType.Shipment,
  ]),
  ...grant(RoleCode.WarehouseSupervisor, ActionCode.Adjust, [ObjectType.InventoryMovement, ObjectType.CycleCount]),
];

const COORDINATOR_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ObjectType.ReasonCode,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Create, [ObjectType.ApprovalRequest, ObjectType.ExceptionCase]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Update, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Read, V1_OPERATIONAL),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Create, [
    ObjectType.Partner,
    ObjectType.InboundPlan,
    ObjectType.Receipt,
    ObjectType.OutboundOrder,
    ObjectType.Allocation,
    ObjectType.PickTask,
    ObjectType.Package,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.IntegrationMessage,
  ]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Update, [
    ObjectType.Partner,
    ObjectType.InboundPlan,
    ObjectType.Receipt,
    ...V1_TASKS,
    ObjectType.OutboundOrder,
    ObjectType.Allocation,
    ObjectType.Package,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.IntegrationMessage,
  ]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.DeleteCancel, [
    ObjectType.InboundPlan,
    ObjectType.OutboundOrder,
    ObjectType.Shipment,
  ]),
  ...grant(RoleCode.WarehouseCoordinator, ActionCode.Reprint, V1_LABELS),
];

const OPERATOR_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.Operator, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.Operator, ActionCode.Create, [ObjectType.ApprovalRequest, ObjectType.ExceptionCase]),
  ...grant(RoleCode.Operator, ActionCode.Read, [
    ObjectType.Receipt,
    ...V1_TASKS,
    ObjectType.Package,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.PrintJob,
  ]),
  ...grant(RoleCode.Operator, ActionCode.Update, [
    ObjectType.Receipt,
    ...V1_TASKS,
    ObjectType.Package,
    ObjectType.Load,
    ObjectType.PrintJob,
  ]),
  ...grant(RoleCode.Operator, ActionCode.Reprint, [ObjectType.PrintJob]),
];

const QC_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.Qc, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ObjectType.ReasonCode,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.Qc, ActionCode.Approve, [ObjectType.ApprovalRequest, ObjectType.ExceptionCase]),
  ...grant(RoleCode.Qc, ActionCode.Override, [ObjectType.OverrideLog]),
  ...grant(RoleCode.Qc, ActionCode.Create, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.Qc, ActionCode.Update, [ObjectType.ExceptionCase]),
  ...grant(RoleCode.Qc, ActionCode.Read, [ObjectType.Receipt, ObjectType.QcTask, ObjectType.InventoryMovement]),
  ...grant(RoleCode.Qc, ActionCode.Create, [ObjectType.QcTask]),
  ...grant(RoleCode.Qc, ActionCode.Update, [ObjectType.QcTask, ObjectType.InventoryMovement]),
  ...grant(RoleCode.Qc, ActionCode.Approve, [ObjectType.QcTask]),
  ...grant(RoleCode.Qc, ActionCode.Override, [ObjectType.QcTask]),
];

const ACCOUNTANT_GRANTS: RolePermissionGrant[] = [
  ...grant(RoleCode.InventoryAccountant, ActionCode.Read, [
    ...MASTER_LOCATION,
    ...SKU_OWNER,
    ...PROFILE_RULE,
    ObjectType.ApprovalRequest,
    ObjectType.OverrideLog,
    ObjectType.AuditLog,
    ObjectType.ExceptionCase,
  ]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Approve, [ObjectType.ApprovalRequest, ObjectType.ExceptionCase]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Override, [ObjectType.OverrideLog]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Adjust, [ObjectType.InventoryStatus]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Read, [
    ObjectType.InventoryMovement,
    ObjectType.CycleCount,
    ObjectType.GoodsIssue,
    ObjectType.IntegrationMessage,
    ObjectType.DeadLetterMessage,
    ObjectType.ReconciliationRun,
  ]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Approve, [ObjectType.GoodsIssue, ObjectType.ReconciliationRun]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Override, [
    ObjectType.IntegrationMessage,
    ObjectType.DeadLetterMessage,
    ObjectType.ReconciliationRun,
  ]),
  ...grant(RoleCode.InventoryAccountant, ActionCode.Adjust, [
    ObjectType.InventoryMovement,
    ObjectType.CycleCount,
    ObjectType.Shipment,
    ObjectType.Load,
    ObjectType.GoodsIssue,
    ObjectType.ReconciliationRun,
  ]),
];

export const ROLE_PERMISSION_GRANTS: ReadonlyArray<RolePermissionGrant> = [
  ...ADMIN_GRANTS,
  ...SUPERVISOR_GRANTS,
  ...COORDINATOR_GRANTS,
  ...OPERATOR_GRANTS,
  ...QC_GRANTS,
  ...ACCOUNTANT_GRANTS,
];

/**
 * Derived permission catalog: the unique set of `(action, object)` pairs referenced
 * by any grant. Building it from the grants guarantees every granted permission
 * exists and that all nine ActionCode values are represented.
 */
export const PERMISSION_CATALOG: ReadonlyArray<PermissionCatalogEntry> = (() => {
  const seen = new Set<string>();
  const catalog: PermissionCatalogEntry[] = [];
  for (const g of ROLE_PERMISSION_GRANTS) {
    const key = `${g.Action}:${g.ObjectType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    catalog.push({ Action: g.Action, ObjectType: g.ObjectType });
  }
  return catalog;
})();
