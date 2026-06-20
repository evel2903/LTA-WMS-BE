import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';

/**
 * A validation-rule catalog item (doc 09 RBAC-VAL-01..10). Structured record of each core
 * validation rule the V0 control layer enforces: code/description/trigger/expected result,
 * the owning C-story module(s), and an optional link to the control-exception it raises.
 */
export class ValidationRuleCatalogEntity {
  public readonly Id: string;
  public Code: string;
  public Description: string;
  public Trigger: string;
  public ExpectedResult: string;
  public OwnerModule: string;
  public ControlExceptionCode: string | null;
  public ImplementationStatus: CatalogImplementationStatus;
  public SourceDocRef: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    Code: string;
    Description: string;
    Trigger: string;
    ExpectedResult: string;
    OwnerModule: string;
    ControlExceptionCode?: string | null;
    ImplementationStatus: CatalogImplementationStatus;
    SourceDocRef?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.Code = params.Code;
    this.Description = params.Description;
    this.Trigger = params.Trigger;
    this.ExpectedResult = params.ExpectedResult;
    this.OwnerModule = params.OwnerModule;
    this.ControlExceptionCode = params.ControlExceptionCode ?? null;
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
}
