import { randomUUID } from 'crypto';
import { Role as LegacyRole } from '@common/Constants/Role';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';

/**
 * Legacy `users.role` varchar → V0 RoleCode mapping (architecture 6.1).
 * Unknown legacy values fall back to OPERATOR (least privilege) so the bridge
 * never grants admin by accident.
 */
export const LEGACY_ROLE_MAP: Readonly<Record<string, RoleCode>> = {
  [LegacyRole.Admin]: RoleCode.WmsAdmin,
  [LegacyRole.User]: RoleCode.Operator,
};

export function MapLegacyRole(legacyRole: string): RoleCode {
  return LEGACY_ROLE_MAP[legacyRole] ?? RoleCode.Operator;
}

export interface LegacyUserRow {
  Id: string;
  Role: string;
}

/**
 * Idempotent bridge: for each legacy user, ensure a `user_roles` row mapping their
 * `users.role` to the matching V0 role. Never touches `users.role`, never deletes
 * users. Roles must be seeded first. Returns the number of rows created.
 */
export async function BridgeLegacyUserRoles(
  users: ReadonlyArray<LegacyUserRow>,
  roleRepository: IRoleRepository,
  userRoleRepository: IUserRoleRepository,
): Promise<number> {
  let created = 0;
  for (const user of users) {
    const targetCode = MapLegacyRole(user.Role);
    const role = await roleRepository.FindByCode(targetCode);
    if (!role) {
      // Roles must be seeded before bridging. Surface the skip instead of silently
      // dropping the user (e.g. if seed order is ever changed).
      console.warn(`LegacyRoleBridge: role ${targetCode} not seeded; skipped user ${user.Id}`);
      continue;
    }
    const existing = await userRoleRepository.FindByUserAndRole(user.Id, role.Id);
    if (existing) continue;
    await userRoleRepository.Create(
      new UserRoleEntity({
        Id: randomUUID(),
        UserId: user.Id,
        RoleId: role.Id,
        Source: UserRoleSource.LegacyBridge,
        AssignedAt: new Date(),
        AssignedBy: null,
      }),
    );
    created += 1;
  }
  return created;
}
