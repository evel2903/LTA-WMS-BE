import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';

/**
 * An immutable, append-only record of a controlled rule override (architecture 6.7, FR-11/FR-17).
 * One row is written per successful override of a non-compliance rule outcome: it captures the rule,
 * the actor, the target object, the reason/evidence/approval that justified the override, the
 * before/after snapshot and the audit correlation. The row is NEVER updated or deleted — the DB
 * trigger (migration 1781635000000) blocks UPDATE/DELETE, mirroring audit_logs (C4). All fields are
 * `readonly`: the entity is a write-once value carrier.
 */
export class OverrideLogEntity {
  public readonly Id: string;
  public readonly RuleId: string;
  public readonly RuleCode: string;
  public readonly ActorUserId: string;
  public readonly TargetObjectType: ObjectType;
  public readonly TargetObjectId: string;
  public readonly TargetObjectCode: string | null;
  public readonly Scope: Record<string, unknown> | null;
  /** The control mode that was overridden (e.g. SOFT_WARNING / APPROVAL_REQUIRED). */
  public readonly ControlMode: RuleControlMode;
  /** The action the override is recorded under — always Override in V0. */
  public readonly Action: ActionCode;
  public readonly ReasonCodeId: string | null;
  public readonly ReasonNote: string | null;
  public readonly EvidenceRefs: unknown[] | null;
  /** Reference to an APPROVED ApprovalRequest when the rule required approval. */
  public readonly ApprovalRequestId: string | null;
  public readonly BeforeJson: Record<string, unknown> | null;
  public readonly AfterJson: Record<string, unknown> | null;
  /** Audit linkage — carries the audit CorrelationId (V0; a hard FK to audit_logs.id is deferred). */
  public readonly AuditRef: string | null;
  public readonly CorrelationId: string | null;
  public readonly CreatedAt: Date;
  public readonly CreatedBy: string | null;

  constructor(params: {
    Id: string;
    RuleId: string;
    RuleCode: string;
    ActorUserId: string;
    TargetObjectType: ObjectType;
    TargetObjectId: string;
    TargetObjectCode?: string | null;
    Scope?: Record<string, unknown> | null;
    ControlMode: RuleControlMode;
    Action?: ActionCode;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: unknown[] | null;
    ApprovalRequestId?: string | null;
    BeforeJson?: Record<string, unknown> | null;
    AfterJson?: Record<string, unknown> | null;
    AuditRef?: string | null;
    CorrelationId?: string | null;
    CreatedAt: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.RuleId = params.RuleId;
    this.RuleCode = params.RuleCode;
    this.ActorUserId = params.ActorUserId;
    this.TargetObjectType = params.TargetObjectType;
    this.TargetObjectId = params.TargetObjectId;
    this.TargetObjectCode = params.TargetObjectCode ?? null;
    this.Scope = params.Scope ?? null;
    this.ControlMode = params.ControlMode;
    this.Action = params.Action ?? ActionCode.Override;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? null;
    this.ApprovalRequestId = params.ApprovalRequestId ?? null;
    this.BeforeJson = params.BeforeJson ?? null;
    this.AfterJson = params.AfterJson ?? null;
    this.AuditRef = params.AuditRef ?? null;
    this.CorrelationId = params.CorrelationId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
