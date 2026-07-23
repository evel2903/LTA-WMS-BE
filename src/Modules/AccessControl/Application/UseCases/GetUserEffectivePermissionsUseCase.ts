import { DataSource } from 'typeorm';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { EffectivePermissionsDto } from '@modules/AccessControl/Application/DTOs/EffectivePermissionsDto';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';

/**
 * Resolves a user's effective permissions: the union of permissions across every
 * ACTIVE role the user holds (user_roles → role_permissions → permissions). An
 * Inactive role contributes neither its code nor its permissions (contract D3).
 * Returns an empty set for a user with no active roles — deny by default is the
 * caller's job (C2). Also carries the per-user assignment `EffectiveVersion` (AC7).
 */
export class GetUserEffectivePermissionsUseCase {
  constructor(
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly dataSource: DataSource,
    private readonly ledger: IAssignmentLedgerRepository,
  ) {}

  public async Execute(userId: string): Promise<EffectivePermissionsDto> {
    // AC7: surface the per-user assignment EffectiveVersion (decimal string, '0' when no row yet).
    // Read FIRST — before the role/permission reads — so that if a concurrent assign commits mid-call
    // the returned version can only LAG the returned role set, never lead it (the conservative
    // direction; Review Finding, round 2). This is the ASSIGNMENT-set version: per AC7, `Roles` (active
    // effective roles) are deliberately decoupled from it — a Role.Status change moves `Roles` but not
    // this version — so it is an assignment signal, not a checksum of `Roles`. Read-only, never writes.
    const effectiveVersion = await this.dataSource.transaction((manager) =>
      this.ledger.ReadEffectiveVersionShared(manager, userId),
    );

    const userRoles = await this.userRoleRepository.FindByUserId(userId);
    const roleIds = userRoles.map((ur) => ur.RoleId);

    const roles = await this.roleRepository.FindByIds(roleIds);
    const activeRoles = roles.filter((role) => role.Status === RoleStatus.Active);
    const activeRoleIds = activeRoles.map((role) => role.Id);

    const rolePermissions = await this.rolePermissionRepository.FindByRoleIds(activeRoleIds);
    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.PermissionId))];
    const permissions = await this.permissionRepository.FindByIds(permissionIds);

    return {
      UserId: userId,
      EffectiveVersion: effectiveVersion,
      Roles: activeRoles.map((role) => role.RoleCode),
      Permissions: permissions.map((permission) => ({
        Action: permission.Action,
        ObjectType: permission.ObjectType,
        PermissionCode: permission.PermissionCode,
      })),
    };
  }
}
