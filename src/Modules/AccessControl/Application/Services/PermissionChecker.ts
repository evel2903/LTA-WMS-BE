import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import {
  PermissionCheckContext,
  PermissionDecision,
  ScopeTarget,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import {
  IPermissionChecker,
  PermissionDataScopeDecision,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IDataScopeRepository, PrincipalRef } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';
import {
  AuthorizationSnapshot,
  AuthorizationSnapshotDataScope,
} from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { IAuthorizationSnapshotResolver } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';

const SEGREGATED_ACTIONS = new Set<ActionCode>([ActionCode.Approve, ActionCode.Override]);

/**
 * Reads the caller's RBAC by UserId (request.user carries only legacy Role, not RBAC),
 * then: (1) deny-by-default if no ACTIVE role grants (action, object) — an Inactive role
 * contributes nothing (contract D3); (2) segregation block for Approve/Override on own
 * request; (3) data-scope match for any request-resident scope axis. Objects without a
 * scope axis (or requests with no scope value) skip step 3.
 */
export class PermissionChecker implements IPermissionChecker {
  constructor(
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly dataScopeRepository: IDataScopeRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly requestContext?: AuthorizationSnapshotContext,
    private readonly snapshotResolver?: IAuthorizationSnapshotResolver,
  ) {}

  public async Check(context: PermissionCheckContext, snapshot?: AuthorizationSnapshot): Promise<PermissionDecision> {
    const currentSnapshot = await this.SnapshotFor(context.UserId, snapshot);
    if (currentSnapshot) return this.CheckSnapshot(context, currentSnapshot);
    return await this.CheckRepositories(context);
  }

  private async CheckRepositories(context: PermissionCheckContext): Promise<PermissionDecision> {
    const userRoles = await this.userRoleRepository.FindByUserId(context.UserId);
    const roleIds = userRoles.map((ur) => ur.RoleId);
    if (roleIds.length === 0) {
      return { Allowed: false, Reason: 'PERMISSION_DENIED' };
    }

    const roles = await this.roleRepository.FindByIds(roleIds);
    const activeRoleIds = roles.filter((role) => role.Status === RoleStatus.Active).map((role) => role.Id);
    if (activeRoleIds.length === 0) {
      return { Allowed: false, Reason: 'PERMISSION_DENIED' };
    }

    const rolePermissions = await this.rolePermissionRepository.FindByRoleIds(activeRoleIds);
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
        ...activeRoleIds.map((id) => ({ Type: PrincipalType.Role, Id: id })),
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

  public async ResolveDataScope(
    context: {
      UserId: string;
      Action: ActionCode;
      ObjectType: PermissionCheckContext['ObjectType'];
    },
    snapshot?: AuthorizationSnapshot,
  ): Promise<PermissionDataScopeDecision> {
    const currentSnapshot = await this.SnapshotFor(context.UserId, snapshot);
    const permission = await this.Check(context, currentSnapshot);
    if (!permission.Allowed) {
      return {
        ...permission,
        WarehouseIds: [],
        OwnerIds: [],
      };
    }

    if (currentSnapshot) {
      return {
        Allowed: true,
        WarehouseIds: this.ResolveAxis(currentSnapshot.DataScopes, DataScopeType.Warehouse),
        OwnerIds: this.ResolveAxis(currentSnapshot.DataScopes, DataScopeType.Owner),
      };
    }

    const userRoles = await this.userRoleRepository.FindByUserId(context.UserId);
    const roles = await this.roleRepository.FindByIds(userRoles.map((userRole) => userRole.RoleId));
    const activeRoleIds = roles.filter((role) => role.Status === RoleStatus.Active).map((role) => role.Id);
    const principals: PrincipalRef[] = [
      { Type: PrincipalType.User, Id: context.UserId },
      ...activeRoleIds.map((id) => ({ Type: PrincipalType.Role, Id: id })),
    ];
    const scopes = await this.dataScopeRepository.FindByPrincipals(principals);
    return {
      Allowed: true,
      WarehouseIds: this.ResolveAxis(scopes, DataScopeType.Warehouse),
      OwnerIds: this.ResolveAxis(scopes, DataScopeType.Owner),
    };
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

  private ResolveAxis(
    scopes: Array<Pick<AuthorizationSnapshotDataScope, 'ScopeType' | 'ScopeValueId' | 'IncludeAll'>>,
    type: DataScopeType,
  ): string[] | null {
    const axisScopes = scopes.filter((scope) => scope.ScopeType === type);
    if (axisScopes.some((scope) => scope.IncludeAll)) return null;
    return [
      ...new Set(
        axisScopes
          .map((scope) => scope.ScopeValueId)
          .filter((scopeValueId): scopeValueId is string => scopeValueId !== null),
      ),
    ];
  }

  private async SnapshotFor(
    userId: string,
    explicit?: AuthorizationSnapshot,
  ): Promise<AuthorizationSnapshot | undefined> {
    if (explicit?.UserId === userId) return explicit;
    const resolved = this.requestContext?.Get(userId);
    if (resolved) return resolved;
    if (this.requestContext?.IsActor(userId) && this.snapshotResolver) {
      return await this.requestContext.Resolve(userId, () => this.snapshotResolver!.Resolve(userId));
    }
    return undefined;
  }

  private CheckSnapshot(context: PermissionCheckContext, snapshot: AuthorizationSnapshot): PermissionDecision {
    if (snapshot.ActiveRoles.length === 0) return { Allowed: false, Reason: 'PERMISSION_DENIED' };
    const hasPermission = snapshot.Permissions.some(
      (permission) => permission.Action === context.Action && permission.ObjectType === context.ObjectType,
    );
    if (!hasPermission) return { Allowed: false, Reason: 'PERMISSION_DENIED' };

    if (
      SEGREGATED_ACTIONS.has(context.Action) &&
      context.Scope?.RequesterUserId &&
      context.Scope.RequesterUserId === context.UserId
    ) {
      return { Allowed: false, Reason: 'SELF_APPROVAL' };
    }

    for (const axis of this.RequestedAxes(context.Scope)) {
      const inScope = snapshot.DataScopes.some(
        (scope) => scope.ScopeType === axis.Type && (scope.IncludeAll || scope.ScopeValueId === axis.Value),
      );
      if (!inScope) return { Allowed: false, Reason: 'OUT_OF_SCOPE' };
    }

    return { Allowed: true };
  }
}
