import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import {
  PermissionCheckContext,
  PermissionDecision,
  ScopeTarget,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IDataScopeRepository, PrincipalRef } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';

const SEGREGATED_ACTIONS = new Set<ActionCode>([ActionCode.Approve, ActionCode.Override]);

/**
 * Reads the caller's RBAC by UserId (request.user carries only legacy Role, not RBAC),
 * then: (1) deny-by-default if no role grants (action, object); (2) segregation block
 * for Approve/Override on own request; (3) data-scope match for any request-resident
 * scope axis. Objects without a scope axis (or requests with no scope value) skip step 3.
 */
export class PermissionChecker implements IPermissionChecker {
  constructor(
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly dataScopeRepository: IDataScopeRepository,
  ) {}

  public async Check(context: PermissionCheckContext): Promise<PermissionDecision> {
    const userRoles = await this.userRoleRepository.FindByUserId(context.UserId);
    const roleIds = userRoles.map((ur) => ur.RoleId);
    if (roleIds.length === 0) {
      return { Allowed: false, Reason: 'PERMISSION_DENIED' };
    }

    const rolePermissions = await this.rolePermissionRepository.FindByRoleIds(roleIds);
    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.PermissionId))];
    const permissions = await this.permissionRepository.FindByIds(permissionIds);
    const hasPermission = permissions.some((p) => p.Action === context.Action && p.ObjectType === context.ObjectType);
    if (!hasPermission) {
      return { Allowed: false, Reason: 'PERMISSION_DENIED' };
    }

    if (
      SEGREGATED_ACTIONS.has(context.Action) &&
      context.Scope?.RequesterUserId &&
      context.Scope.RequesterUserId === context.UserId
    ) {
      return { Allowed: false, Reason: 'SELF_APPROVAL' };
    }

    const requestedAxes = this.RequestedAxes(context.Scope);
    if (requestedAxes.length > 0) {
      const principals: PrincipalRef[] = [
        { Type: PrincipalType.User, Id: context.UserId },
        ...roleIds.map((id) => ({ Type: PrincipalType.Role, Id: id })),
      ];
      const scopes = await this.dataScopeRepository.FindByPrincipals(principals);
      for (const axis of requestedAxes) {
        const inScope = scopes.some(
          (s) => s.ScopeType === axis.Type && (s.IncludeAll || s.ScopeValueId === axis.Value),
        );
        if (!inScope) {
          return { Allowed: false, Reason: 'OUT_OF_SCOPE' };
        }
      }
    }

    return { Allowed: true };
  }

  private RequestedAxes(scope?: ScopeTarget): Array<{ Type: DataScopeType; Value: string }> {
    if (!scope) return [];
    const axes: Array<{ Type: DataScopeType; Value: string | null | undefined }> = [
      { Type: DataScopeType.Warehouse, Value: scope.WarehouseId },
      { Type: DataScopeType.Zone, Value: scope.ZoneId },
      { Type: DataScopeType.Owner, Value: scope.OwnerId },
    ];
    return axes.filter((a): a is { Type: DataScopeType; Value: string } => a.Value != null);
  }
}
