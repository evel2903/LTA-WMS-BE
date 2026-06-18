/**
 * Stable item codes for the B7 warehouse-profile checklist (AC2). Centralised so codes are never
 * hard-coded at call sites (A6 REFACTOR lesson) and so C10/C12 can assert against a fixed contract.
 *
 * The ten AC2 groups each map to a primary code; a few groups have an explicit Deferred sub-item so
 * the V0-evaluable part and the V1+/Epic-C part carry independent statuses (no vague defer, AC3).
 */
export const ProfileChecklistItemCode = {
  /** Exactly one active profile for the target scope/type at EvaluatedAt. */
  ActiveProfile: 'WP-ACTIVE',
  /** Bound rules belong to ACTIVE catalog groups (PLACEHOLDER -> Deferred). */
  RuleGroup: 'WP-RULE-GROUP',
  /** Resolved winner control mode is one of the four valid modes. */
  ControlMode: 'WP-CONTROL-MODE',
  /** RulePreviewResult.Conflicts is empty. */
  PrecedenceConflict: 'WP-PRECEDENCE-CONFLICT',
  /** An active fallback profile exists for the warehouse type (resolver fallback). */
  DefaultProfile: 'WP-DEFAULT',
  /** System-default global seed (architecture 5.5) — not seeded in V0. */
  DefaultSystemSeed: 'WP-DEFAULT-SYSTEM-SEED',
  /** Override-readiness flags (AllowOverride/RequiresReason/RequiresEvidence) are readable. */
  OverrideReady: 'WP-OVERRIDE-READY',
  /** Override execution/apply — Epic C. */
  OverrideExecution: 'WP-OVERRIDE-EXEC',
  /** Audit-readiness flags + LastActivation metadata are present. */
  AuditReady: 'WP-AUDIT-READY',
  /** Immutable before/after audit trail enforcement — Epic C. */
  AuditImmutable: 'WP-AUDIT-IMMUTABLE',
  /** reason_code catalog validation — Epic C. */
  AuditReasonCatalog: 'WP-AUDIT-REASON-CATALOG',
  /** Effective window contains EvaluatedAt and Version >= 1. */
  EffectiveVersion: 'WP-EFFECTIVE-VERSION',
  /** Owner/customer scope is consistent (no out-of-scope owner mix). */
  OwnerSegregation: 'WP-OWNER-SEGREGATION',
  /** Full multi-owner data-scope enforcement / RBAC — Epic C. */
  RbacReady: 'WP-RBAC-READY',
  /** Compliance hard block is a legitimate winner; non-compliance hard block is a misconfig. */
  Compliance: 'WP-COMPLIANCE',
} as const;

export type ProfileChecklistItemCode = (typeof ProfileChecklistItemCode)[keyof typeof ProfileChecklistItemCode];
