import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionSubStatus } from '@modules/AccessControl/Domain/Enums/ExceptionSubStatus';
import { ExceptionOutcome } from '@modules/AccessControl/Domain/Enums/ExceptionOutcome';

/**
 * An exception case with a 6-state lifecycle (architecture 6.8 / story C9):
 * DETECTED -> LOGGED -> ASSIGNED -> IN_REVIEW_PENDING_APPROVAL -> RESOLVED -> CLOSED.
 * `ExceptionType` is a control-exception catalog code (C8) that drives reason/evidence/
 * approval requirements at resolve/close. The case is never deleted; cancel/duplicate are
 * recorded as `Outcome`. Doc-09 secondary states are carried on `SubStatus`/`Outcome`.
 */
export class ExceptionCaseEntity {
  public readonly Id: string;
  public ExceptionType: string;
  public State: ExceptionState;
  public SubStatus: ExceptionSubStatus | null;
  public Outcome: ExceptionOutcome | null;
  public ReferenceType: string;
  public ReferenceId: string;
  public WarehouseId: string | null;
  public OwnerId: string | null;
  public ReasonCodeId: string | null;
  public AssignedToUserId: string | null;
  public AssignedRoleId: string | null;
  public DetectedRuleId: string | null;
  public ApprovalRequestId: string | null;
  public Severity: ControlExceptionSeverity;
  public EvidenceRefs: unknown[] | null;
  public ResolutionNote: string | null;
  public OpenedAt: Date;
  public ResolvedAt: Date | null;
  public ClosedAt: Date | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    ExceptionType: string;
    State?: ExceptionState;
    SubStatus?: ExceptionSubStatus | null;
    Outcome?: ExceptionOutcome | null;
    ReferenceType: string;
    ReferenceId: string;
    WarehouseId?: string | null;
    OwnerId?: string | null;
    ReasonCodeId?: string | null;
    AssignedToUserId?: string | null;
    AssignedRoleId?: string | null;
    DetectedRuleId?: string | null;
    ApprovalRequestId?: string | null;
    Severity: ControlExceptionSeverity;
    EvidenceRefs?: unknown[] | null;
    ResolutionNote?: string | null;
    OpenedAt: Date;
    ResolvedAt?: Date | null;
    ClosedAt?: Date | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ExceptionType = params.ExceptionType;
    this.State = params.State ?? ExceptionState.Detected;
    this.SubStatus = params.SubStatus ?? null;
    this.Outcome = params.Outcome ?? null;
    this.ReferenceType = params.ReferenceType;
    this.ReferenceId = params.ReferenceId;
    this.WarehouseId = params.WarehouseId ?? null;
    this.OwnerId = params.OwnerId ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.AssignedToUserId = params.AssignedToUserId ?? null;
    this.AssignedRoleId = params.AssignedRoleId ?? null;
    this.DetectedRuleId = params.DetectedRuleId ?? null;
    this.ApprovalRequestId = params.ApprovalRequestId ?? null;
    this.Severity = params.Severity;
    this.EvidenceRefs = params.EvidenceRefs ?? null;
    this.ResolutionNote = params.ResolutionNote ?? null;
    this.OpenedAt = params.OpenedAt;
    this.ResolvedAt = params.ResolvedAt ?? null;
    this.ClosedAt = params.ClosedAt ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public IsState(state: ExceptionState): boolean {
    return this.State === state;
  }

  public HasEvidence(): boolean {
    return Array.isArray(this.EvidenceRefs) && this.EvidenceRefs.length > 0;
  }
}
