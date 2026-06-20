import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';

/**
 * A control-exception catalog item (doc 09 CTRL-EX-01..09). Reference data: structured
 * seed of the control scenarios V0 enforces (C1-C7) plus exception-lifecycle items C9
 * consumes (reason/evidence/category) and advanced items deferred to V1+. `OwnerRoles`
 * is a free-form string[] (NOT a RoleCode FK): doc 09 names actors outside the 6 core
 * roles (IT/WMS Admin, Compliance, exception actor).
 */
export class ControlExceptionCatalogEntity {
  public readonly Id: string;
  public Code: string;
  public Scenario: string;
  public Category: ControlExceptionCategory;
  public Severity: ControlExceptionSeverity;
  public DefaultState: ControlExceptionDefaultState;
  public ActionAllowed: ControlExceptionAction;
  public ReasonRequired: boolean;
  public EvidenceRequired: boolean;
  public ApprovalRequired: boolean;
  public OwnerRoles: string[];
  public ImplementationStatus: CatalogImplementationStatus;
  public SourceDocRef: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    Code: string;
    Scenario: string;
    Category: ControlExceptionCategory;
    Severity: ControlExceptionSeverity;
    DefaultState: ControlExceptionDefaultState;
    ActionAllowed: ControlExceptionAction;
    ReasonRequired?: boolean;
    EvidenceRequired?: boolean;
    ApprovalRequired?: boolean;
    OwnerRoles?: string[];
    ImplementationStatus: CatalogImplementationStatus;
    SourceDocRef?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.Code = params.Code;
    this.Scenario = params.Scenario;
    this.Category = params.Category;
    this.Severity = params.Severity;
    this.DefaultState = params.DefaultState;
    this.ActionAllowed = params.ActionAllowed;
    this.ReasonRequired = params.ReasonRequired ?? false;
    this.EvidenceRequired = params.EvidenceRequired ?? false;
    this.ApprovalRequired = params.ApprovalRequired ?? false;
    this.OwnerRoles = params.OwnerRoles ?? [];
    this.ImplementationStatus = params.ImplementationStatus;
    this.SourceDocRef = params.SourceDocRef ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  /** Required for V0: enforced (Implemented) or part of the C9 exception lifecycle. */
  public IsRequiredForV0(): boolean {
    return (
      this.ImplementationStatus === CatalogImplementationStatus.Implemented ||
      this.ImplementationStatus === CatalogImplementationStatus.DeferredToC9
    );
  }

  /** Advanced item deferred past V0 (escalation/analytics/manual-fix). */
  public IsDeferredV1Plus(): boolean {
    return this.ImplementationStatus === CatalogImplementationStatus.DeferredV1Plus;
  }
}
