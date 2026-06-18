import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';

/**
 * B4 preview/simulation contract (HỢP ĐỒNG for B5 activation gate + B6 preview panel).
 *
 * The use case maps a PreviewRuleResolutionInput onto a B3 RuleEvaluationContext, runs the B3
 * resolver (single source of truth), then projects RuleDecision + detected conflicts onto
 * RulePreviewResult. No persistence, no override execution, no permission/audit enforcement:
 * ReasonReadiness / ActorContext are read-only metadata for B5/Epic C.
 */

/** Input to the preview use case: the six V0 axes + actor metadata + as-of time + business attributes. */
export interface PreviewRuleResolutionInput {
  // Six V0 configuration axes (architecture 5.3). WarehouseTypeCode is business-required.
  WarehouseTypeCode: string;
  WarehouseId?: string | null;
  ZoneId?: string | null;
  LocationType?: string | null;
  OwnerId?: string | null;
  SkuId?: string | null;
  ItemClass?: string | null;
  OrderType?: string | null;
  CustomerId?: string | null;
  SupplierId?: string | null;

  // Actor/action/object metadata, echoed back for B5/Epic C; B4 does NOT enforce.
  ActorUserId?: string | null;
  Action?: string | null;
  ObjectType?: string | null;
  ObjectId?: string | null;
  ReasonCode?: string | null;

  // Optional "as-of" evaluation time and business attributes read by condition predicates.
  EvaluatedAt?: Date;
  Attributes?: Record<string, unknown>;
}

/**
 * Finite skipped-reason taxonomy so B6 can render consistent labels instead of free text.
 * Reasons are computed from RulePrecedence (the single precedence/specificity source), never
 * hard-coded per call site, and never contradict the B3 sort.
 */
export enum SkippedReason {
  /** Lower precedence tier than the winner. */
  LowerTier = 'LOWER_TIER',
  /** Same tier as the winner but a less specific scope. */
  LessSpecific = 'LESS_SPECIFIC',
  /** Same tier + specificity as the winner but a higher EFFECTIVE priority (lower priority wins). */
  LowerPriorityTieBreak = 'LOWER_PRIORITY_TIEBREAK',
  /** Same tier + specificity + effective priority as the winner but an older EffectiveFrom (newer wins). */
  NewerEffectiveWins = 'NEWER_EFFECTIVE_WINS',
  /** A non-hard-block sibling in the Compliance tier that the compliance hard block shadows. */
  ShadowedByComplianceHardBlock = 'SHADOWED_BY_COMPLIANCE_HARD_BLOCK',
}

/** The winning (applied) rule projected to a flat view; null when no candidate matched. */
export interface AppliedRuleView {
  RuleCode: string;
  RuleName: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
}

/** A non-winning candidate with the precedence/specificity reason it lost. */
export interface SkippedRuleView {
  RuleCode: string;
  RuleName: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
  Reason: SkippedReason;
}

/** One rule participating in a same-scope same-category conflict group. */
export interface ConflictRuleView {
  RuleCode: string;
  RuleName: string;
  ControlMode: RuleControlMode;
}

/**
 * A measured conflict: >=2 rules with the same PrecedenceTier and same scope-signature but
 * divergent ControlMode. Reported as DATA (not an error); B5 decides whether to block activation.
 */
export interface RuleConflictView {
  PrecedenceTier: RulePrecedenceTier;
  ScopeKey: string;
  WinnerRuleCode: string;
  Rules: ConflictRuleView[];
}

/** The four-mode summary distinguishing how the winner controls the operation. */
export interface ControlModeSummary {
  Mode: RuleControlMode | null;
  IsHardBlock: boolean;
  ApprovalRequired: boolean;
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
}

/** Read-only override-readiness flags copied from the winner; B4 does not enforce them. */
export interface ReasonReadinessView {
  RequiresReason: boolean;
  RequiresEvidence: boolean;
  AllowOverride: boolean;
}

/** Echo of the actor context input, surfaced as metadata for B5/Epic C. */
export interface ActorContextView {
  ActorUserId: string | null;
  Action: string | null;
  ObjectType: string | null;
  ObjectId: string | null;
  ReasonCode: string | null;
}

/** Full preview response. PascalCase; this is the stable B6/B5 contract. */
export interface RulePreviewResult {
  Winner: AppliedRuleView | null;
  Allowed: boolean;
  ApprovalRequired: boolean;
  ControlMode: ControlModeSummary;
  SkippedRules: SkippedRuleView[];
  Conflicts: RuleConflictView[];
  ReasonReadiness: ReasonReadinessView | null;
  ActorContext: ActorContextView;
}
