/** RH-04 (RH-ASG-01 / D3) assignment intent ledger types. Versions are canonical decimal strings
 * (BIGINT); never JS number. */
export type IntentOperation = 'assign' | 'remove';

/** Intent ticket lifecycle. Registered is a stable supersedable preparation state (NOT an
 * in-flight transaction); terminal states are Applied / SatisfiedNoChange; Superseded is terminal
 * non-applied. */
export type IntentStatus = 'Registered' | 'Superseded' | 'Applied' | 'SatisfiedNoChange';

/** Head status mirrors the current (head) intent's disposition. */
export type HeadStatus = 'Idle' | 'Registered' | 'Applied' | 'SatisfiedNoChange';

export interface IntentRecord {
  RunId: string;
  ActorUserId: string;
  UserId: string;
  RoleId: string;
  CanonicalRoleCode: string;
  Operation: IntentOperation;
  IntentVersion: string;
  Status: IntentStatus;
  EffectiveVersion: string | null;
  Outcome: Record<string, unknown> | null;
}

export interface HeadRecord {
  Id: string;
  UserId: string;
  RoleId: string;
  CurrentIntentVersion: string;
  CurrentRunId: string | null;
  Status: HeadStatus;
}

/** Recovery snapshot returned by GET .../:canonicalRoleCode/intent (raw user_roles, unfiltered). */
export interface AssignmentIntentSnapshot {
  UserId: string;
  RoleCode: string;
  RunId: string | null;
  Operation: IntentOperation | null;
  Status: HeadStatus;
  IntentVersion: string;
  EffectiveVersion: string;
  AssignedRoleCodes: string[];
  IsOwnedByCurrentActor: boolean;
}
