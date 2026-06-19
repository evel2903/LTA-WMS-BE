import { randomUUID } from 'crypto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import {
  ROLE_CATALOG,
  PERMISSION_CATALOG,
  ROLE_PERMISSION_GRANTS,
} from '@modules/AccessControl/Application/Services/AccessControlCatalog';

/**
 * Idempotent RBAC seed: six core roles, the permission catalog and the
 * role→permission matrix. Existing rows (matched by code / pair) are skipped, so
 * re-running never duplicates and never throws. Mirrors RuleGroupCatalogSeed.
 */
export async function SeedAccessControlRbac(
  roleRepository: IRoleRepository,
  permissionRepository: IPermissionRepository,
  rolePermissionRepository: IRolePermissionRepository,
): Promise<void> {
  for (const entry of ROLE_CATALOG) {
    const existing = await roleRepository.FindByCode(entry.Code);
    if (existing) continue;
    const now = new Date();
    await roleRepository.Create(
      new RoleEntity({
        Id: randomUUID(),
        RoleCode: entry.Code,
        RoleName: entry.Name,
        Description: entry.Description,
        IsSystem: true,
        Status: RoleStatus.Active,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }

  for (const entry of PERMISSION_CATALOG) {
    const code = PermissionEntity.BuildCode(entry.Action, entry.ObjectType);
    const existing = await permissionRepository.FindByCode(code);
    if (existing) continue;
    const now = new Date();
    await permissionRepository.Create(
      new PermissionEntity({
        Id: randomUUID(),
        Action: entry.Action,
        ObjectType: entry.ObjectType,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }

  for (const g of ROLE_PERMISSION_GRANTS) {
    const role = await roleRepository.FindByCode(g.Role);
    const permission = await permissionRepository.FindByCode(PermissionEntity.BuildCode(g.Action, g.ObjectType));
    if (!role || !permission) continue;
    const existing = await rolePermissionRepository.FindByRoleAndPermission(role.Id, permission.Id);
    if (existing) continue;
    await rolePermissionRepository.Create(
      new RolePermissionEntity({
        Id: randomUUID(),
        RoleId: role.Id,
        PermissionId: permission.Id,
        CreatedAt: new Date(),
        CreatedBy: 'SEED',
      }),
    );
  }
}
