import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';

/**
 * An approval request for a risky action (control mode APPROVAL_REQUIRED) per the
 * approval matrix (architecture 6.7). Lifecycle is PENDING -> APPROVED | REJECTED,
 * decided exactly once. `Scope` (jsonb) carries the target data scope axes
 * (warehouse/owner/zone) used for segregation + permission re-check at decide time.
 */
export class ApprovalRequestEntity {
  public readonly Id: string;
  public RequesterUserId: string;
  public Action: ActionCode;
  public TargetObjectType: ObjectType;
  public TargetObjectId: string;
  public TargetObjectCode: string | null;
  public Scope: Record<string, unknown> | null;
  public RequestReasonCodeId: string | null;
  public RequestReasonNote: string | null;
  public EvidenceRefs: unknown[] | null;
  public Decision: ApprovalDecision;
  public DecidedByUserId: string | null;
  public DecisionReasonCodeId: string | null;
  public DecisionNote: string | null;
  public DecidedAt: Date | null;
  public ReferenceType: string | null;
  public ReferenceId: string | null;
  public CorrelationId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    RequesterUserId: string;
    Action: ActionCode;
    TargetObjectType: ObjectType;
    TargetObjectId: string;
    TargetObjectCode?: string | null;
    Scope?: Record<string, unknown> | null;
    RequestReasonCodeId?: string | null;
    RequestReasonNote?: string | null;
    EvidenceRefs?: unknown[] | null;
    Decision?: ApprovalDecision;
    DecidedByUserId?: string | null;
    DecisionReasonCodeId?: string | null;
    DecisionNote?: string | null;
    DecidedAt?: Date | null;
    ReferenceType?: string | null;
    ReferenceId?: string | null;
    CorrelationId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.RequesterUserId = params.RequesterUserId;
    this.Action = params.Action;
    this.TargetObjectType = params.TargetObjectType;
    this.TargetObjectId = params.TargetObjectId;
    this.TargetObjectCode = params.TargetObjectCode ?? null;
    this.Scope = params.Scope ?? null;
    this.RequestReasonCodeId = params.RequestReasonCodeId ?? null;
    this.RequestReasonNote = params.RequestReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? null;
    this.Decision = params.Decision ?? ApprovalDecision.Pending;
    this.DecidedByUserId = params.DecidedByUserId ?? null;
    this.DecisionReasonCodeId = params.DecisionReasonCodeId ?? null;
    this.DecisionNote = params.DecisionNote ?? null;
    this.DecidedAt = params.DecidedAt ?? null;
    this.ReferenceType = params.ReferenceType ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CorrelationId = params.CorrelationId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public IsPending(): boolean {
    return this.Decision === ApprovalDecision.Pending;
  }
}
