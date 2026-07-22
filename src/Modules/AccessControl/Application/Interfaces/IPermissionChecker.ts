import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';

export const PERMISSION_CHECKER = Symbol('IPermissionChecker');

export interface PermissionDataScopeDecision extends PermissionDecision {
  /** `null` means include-all for the axis; `[]` means no values are granted. */
  WarehouseIds: string[] | null;
  /** `null` means include-all for the axis; `[]` means no values are granted. */
  OwnerIds: string[] | null;
}

/**
 * Coarse-grained authorization decision: role permission `(action, object)` +
 * data scope + segregation. Deny by default. Used by `PermissionGuard` and,
 * where invariants need re-checking, by use cases (architecture 6.4).
 */
export interface IPermissionChecker {
  Check(context: PermissionCheckContext, snapshot?: AuthorizationSnapshot): Promise<PermissionDecision>;
  /**
   * Resolves list-query scope once so repositories can paginate and count inside the database.
   * Optional for legacy/custom checkers; production PermissionChecker implements it.
   */
  ResolveDataScope?(
    context: {
      UserId: string;
      Action: ActionCode;
      ObjectType: ObjectType;
    },
    snapshot?: AuthorizationSnapshot,
  ): Promise<PermissionDataScopeDecision>;
}
