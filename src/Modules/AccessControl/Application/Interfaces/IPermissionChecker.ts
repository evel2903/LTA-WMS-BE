import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';

export const PERMISSION_CHECKER = Symbol('IPermissionChecker');

/**
 * Coarse-grained authorization decision: role permission `(action, object)` +
 * data scope + segregation. Deny by default. Used by `PermissionGuard` and,
 * where invariants need re-checking, by use cases (architecture 6.4).
 */
export interface IPermissionChecker {
  Check(context: PermissionCheckContext): Promise<PermissionDecision>;
}
