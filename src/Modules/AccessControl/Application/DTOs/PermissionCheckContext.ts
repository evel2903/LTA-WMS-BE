import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

/**
 * Target data scope of a request. Any axis left null/undefined is "not constrained
 * by this request" (the checker skips it). `RequesterUserId` is supplied only by
 * use-case callers (C6) for segregation; the C2 ScopeExtractor never sets it.
 */
export interface ScopeTarget {
  WarehouseId?: string | null;
  ZoneId?: string | null;
  OwnerId?: string | null;
  RequesterUserId?: string | null;
}

export interface PermissionCheckContext {
  UserId: string;
  Action: ActionCode;
  ObjectType: ObjectType;
  Scope?: ScopeTarget;
}

export type DenyReason = 'PERMISSION_DENIED' | 'OUT_OF_SCOPE' | 'SELF_APPROVAL';

export interface PermissionDecision {
  Allowed: boolean;
  Reason?: DenyReason;
}
