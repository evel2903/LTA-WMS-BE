import { randomUUID } from 'crypto';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { IControlExceptionCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalogRepository';

const DOC_REF = 'doc-09 CTRL-EX';

export type ControlExceptionCatalogEntry = {
  Code: string;
  Scenario: string;
  Category: ControlExceptionCategory;
  Severity: ControlExceptionSeverity;
  DefaultState: ControlExceptionDefaultState;
  ActionAllowed: ControlExceptionAction;
  ReasonRequired: boolean;
  EvidenceRequired: boolean;
  ApprovalRequired: boolean;
  OwnerRoles: string[];
  ImplementationStatus: CatalogImplementationStatus;
};

/**
 * V0 control-exception catalog (doc 09 CTRL-EX-01..09). EX-01/02/03/05/08 are enforced
 * in C1-C7 (Implemented); EX-04 is the exception-closure rule C9 owns (DeferredToC9);
 * EX-06/07/09 are advanced escalation/analytics/manual-fix items (DeferredV1Plus).
 * `OwnerRoles` is a free-form string[] (doc 09 names actors outside the 6 core RBAC roles).
 */
export const ControlExceptionCatalogEntries: ReadonlyArray<ControlExceptionCatalogEntry> = [
  {
    Code: 'CTRL-EX-01',
    Scenario: 'User thao tác vượt permission',
    Category: ControlExceptionCategory.AuthorizationDenied,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.Block,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WMS_ADMIN'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-EX-02',
    Scenario: 'Truy cập dữ liệu ngoài data scope',
    Category: ControlExceptionCategory.DataScopeViolation,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.Block,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WMS_ADMIN'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-EX-03',
    Scenario: 'Self-approval bị phát hiện',
    Category: ControlExceptionCategory.SegregationOfDuties,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.RouteToOtherApprover,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'WMS_ADMIN'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-EX-04',
    Scenario: 'Đóng exception thiếu reason/evidence',
    Category: ControlExceptionCategory.ExceptionClosure,
    Severity: ControlExceptionSeverity.Medium,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.Block,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: false,
    OwnerRoles: ['EXCEPTION_ACTOR'],
    ImplementationStatus: CatalogImplementationStatus.DeferredToC9,
  },
  {
    Code: 'CTRL-EX-05',
    Scenario: 'Override compliance hard block',
    Category: ControlExceptionCategory.ComplianceOverride,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.Block,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'COMPLIANCE'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-EX-06',
    Scenario: 'Approval quá thời gian',
    Category: ControlExceptionCategory.ApprovalTimeout,
    Severity: ControlExceptionSeverity.Medium,
    DefaultState: ControlExceptionDefaultState.Escalated,
    ActionAllowed: ControlExceptionAction.Escalate,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'WMS_ADMIN'],
    ImplementationStatus: CatalogImplementationStatus.DeferredV1Plus,
  },
  {
    Code: 'CTRL-EX-07',
    Scenario: 'Tần suất override bất thường',
    Category: ControlExceptionCategory.OverrideFrequency,
    Severity: ControlExceptionSeverity.Medium,
    DefaultState: ControlExceptionDefaultState.Warned,
    ActionAllowed: ControlExceptionAction.Warn,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WMS_ADMIN', 'WAREHOUSE_SUPERVISOR'],
    ImplementationStatus: CatalogImplementationStatus.DeferredV1Plus,
  },
  {
    Code: 'CTRL-EX-08',
    Scenario: 'Đổi cấu hình quyền không versioning',
    Category: ControlExceptionCategory.ConfigVersioning,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.RequireVersionAudit,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    OwnerRoles: ['WMS_ADMIN'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-EX-09',
    Scenario: 'Manual data fix khi tích hợp lỗi',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: true,
    OwnerRoles: ['IT_WMS_ADMIN', 'INVENTORY_ACCOUNTANT'],
    ImplementationStatus: CatalogImplementationStatus.DeferredV1Plus,
  },
  {
    Code: 'CTRL-V1-INVENTORY-RECONCILIATION',
    Scenario: 'Inventory reconciliation failure cần exception evidence, không tự sửa tồn kho',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: false,
    OwnerRoles: ['IT_WMS_ADMIN', 'INVENTORY_ACCOUNTANT'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-V1-PICK-EXCEPTION',
    Scenario: 'Pick task phát sinh short pick, no stock, damaged hoặc wrong item cần xử lý có audit',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'PICKER'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-V1-PICK-SUBSTITUTION',
    Scenario: 'Pick task yêu cầu substitution cần policy/approval trước khi xử lý tiếp',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: true,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'CUSTOMER_SERVICE'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'CTRL-V1-PACK-CHECK-MISMATCH',
    Scenario: 'Pack checking phát hiện mismatch trước khi close package',
    Category: ControlExceptionCategory.ManualDataFix,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Detected,
    ActionAllowed: ControlExceptionAction.RequireSpecialApproval,
    ReasonRequired: true,
    EvidenceRequired: true,
    ApprovalRequired: false,
    OwnerRoles: ['WAREHOUSE_SUPERVISOR', 'PACKER'],
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
];

/** Idempotent: upsert by Code, so re-running never duplicates and keeps fields in sync. */
export async function SeedControlExceptionCatalog(repository: IControlExceptionCatalogRepository): Promise<void> {
  for (const entry of ControlExceptionCatalogEntries) {
    const now = new Date();
    await repository.Upsert(
      new ControlExceptionCatalogEntity({
        Id: randomUUID(),
        Code: entry.Code,
        Scenario: entry.Scenario,
        Category: entry.Category,
        Severity: entry.Severity,
        DefaultState: entry.DefaultState,
        ActionAllowed: entry.ActionAllowed,
        ReasonRequired: entry.ReasonRequired,
        EvidenceRequired: entry.EvidenceRequired,
        ApprovalRequired: entry.ApprovalRequired,
        OwnerRoles: entry.OwnerRoles,
        ImplementationStatus: entry.ImplementationStatus,
        SourceDocRef: DOC_REF,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }
}
