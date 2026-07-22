import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  AuthorizationSnapshot,
  AuthorizationSnapshotDataScope,
  AuthorizationSnapshotPermission,
  AuthorizationSnapshotRole,
} from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { IAuthorizationSnapshotResolver } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';

type SnapshotBarrier = () => Promise<unknown>;

@Injectable()
export class AuthorizationSnapshotResolver implements IAuthorizationSnapshotResolver {
  constructor(
    private readonly dataSource: DataSource,
    private readonly afterRolesRead: SnapshotBarrier = async () => undefined,
  ) {}

  public async Resolve(userId: string): Promise<AuthorizationSnapshot> {
    try {
      return await this.dataSource.transaction('REPEATABLE READ', async (manager) => {
        const roles = await this.ReadActiveRoles(manager, userId);
        await this.afterRolesRead();
        const roleIds = roles.map((role) => role.Id);
        const permissions = await this.ReadPermissions(manager, roleIds);
        const dataScopes = await this.ReadDataScopes(manager, userId, roleIds);
        return { UserId: userId, ActiveRoles: roles, Permissions: permissions, DataScopes: dataScopes };
      });
    } catch (error) {
      if (error instanceof SnapshotResolutionError) throw error;
      throw new SnapshotResolutionError(error);
    }
  }

  private async ReadActiveRoles(manager: EntityManager, userId: string): Promise<AuthorizationSnapshotRole[]> {
    const rows = (await manager.query(
      `
        /* rh_aud_01_active_roles */
        SELECT r.id AS "Id", r.role_code AS "RoleCode"
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.status = 'ACTIVE'
      `,
      [userId],
    )) as Array<{ Id: string; RoleCode: string }>;

    const byId = new Map<string, AuthorizationSnapshotRole>();
    for (const row of rows) {
      const roleCode = CanonicalizeRoleCode(row.RoleCode);
      const id = row.Id.trim();
      if (!byId.has(id)) byId.set(id, { Id: id, RoleCode: roleCode });
    }
    return [...byId.values()].sort(
      (left, right) => this.ByteCompare(left.RoleCode, right.RoleCode) || this.ByteCompare(left.Id, right.Id),
    );
  }

  private async ReadPermissions(manager: EntityManager, roleIds: string[]): Promise<AuthorizationSnapshotPermission[]> {
    const rows = (await manager.query(
      `
        /* rh_aud_01_permissions */
        SELECT DISTINCT p.action COLLATE "C" AS "Action", p.object_type COLLATE "C" AS "ObjectType"
        FROM role_permissions rp
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::bpchar[])
        ORDER BY p.action COLLATE "C", p.object_type COLLATE "C"
      `,
      [roleIds],
    )) as Array<{ Action: ActionCode; ObjectType: ObjectType }>;

    return rows.map((row) => ({ Action: row.Action, ObjectType: row.ObjectType }));
  }

  private async ReadDataScopes(
    manager: EntityManager,
    userId: string,
    roleIds: string[],
  ): Promise<AuthorizationSnapshotDataScope[]> {
    const rows = (await manager.query(
      `
        /* rh_aud_01_data_scopes */
        SELECT principal_type AS "PrincipalType", principal_id AS "PrincipalId",
               scope_type AS "ScopeType", scope_value_id AS "ScopeValueId", include_all AS "IncludeAll"
        FROM data_scopes
        WHERE (principal_type = 'USER' AND principal_id = $1)
           OR (principal_type = 'ROLE' AND principal_id = ANY($2::bpchar[]))
        ORDER BY principal_type COLLATE "C", principal_id, scope_type COLLATE "C", scope_value_id NULLS FIRST
      `,
      [userId, roleIds],
    )) as Array<{
      PrincipalType: PrincipalType;
      PrincipalId: string;
      ScopeType: DataScopeType;
      ScopeValueId: string | null;
      IncludeAll: boolean;
    }>;

    return rows.map((row) => ({
      PrincipalType: row.PrincipalType,
      PrincipalId: row.PrincipalId.trim(),
      ScopeType: row.ScopeType,
      ScopeValueId: row.ScopeValueId?.trim() ?? null,
      IncludeAll: row.IncludeAll,
    }));
  }

  private ByteCompare(left: string, right: string): number {
    return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
  }
}
