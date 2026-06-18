import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';

/**
 * Read-only override-readiness metadata copied from the winning rule's flags.
 * B3 only surfaces these for B4/Epic C; it does NOT enforce permission/reason/evidence.
 */
export interface ReasonReadiness {
  RequiresReason: boolean;
  RequiresEvidence: boolean;
  AllowOverride: boolean;
}

/**
 * Deterministic result of resolving a RuleEvaluationContext against the active profile's rules.
 *
 * This shape is the HỢP ĐỒNG for B4 (preview/conflict/control-mode API): B4 maps `OrderedCandidates`
 * into skipped/conflict views and `ReasonReadiness` into override readiness without re-resolving.
 *
 * Invariant: when a candidate with PrecedenceTier=COMPLIANCE and ControlMode=HARD_BLOCK matches,
 * it is always the Winner and Allowed is false; no lower tier can override it.
 */
export interface RuleDecision {
  Winner: RuleDefinitionEntity | null;
  Allowed: boolean;
  ApprovalRequired: boolean;
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
  OrderedCandidates: RuleDefinitionEntity[];
  ReasonReadiness: ReasonReadiness | null;
}
