import { DataSource, EntityManager } from 'typeorm';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import { AuthorizationSnapshotResolver } from '@modules/AccessControl/Infrastructure/Authorization/AuthorizationSnapshotResolver';
import { AuthorizationSnapshotRoleCodes } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';

const buildDataSource = () => {
  const events: string[] = [];
  const manager = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('rh_aud_01_active_roles')) {
        events.push('roles');
        return [
          { Id: 'role-2', RoleCode: 'operator' },
          { Id: 'role-1', RoleCode: 'wms_admin' },
          { Id: 'role-1', RoleCode: 'WMS_ADMIN' },
        ];
      }
      if (sql.includes('rh_aud_01_permissions')) {
        events.push('permissions');
        return [{ Action: ActionCode.Update, ObjectType: ObjectType.Role }];
      }
      if (sql.includes('rh_aud_01_data_scopes')) {
        events.push('scopes');
        return [
          {
            PrincipalType: PrincipalType.User,
            PrincipalId: 'user-1',
            ScopeType: DataScopeType.Warehouse,
            ScopeValueId: 'warehouse-1',
            IncludeAll: false,
          },
        ];
      }
      throw new Error(`Unexpected query: ${sql}`);
    }),
  } as unknown as EntityManager;
  const transaction = jest.fn(
    async (isolation: string, work: (transactionManager: EntityManager) => Promise<unknown>) => {
      events.push(`tx:${isolation}`);
      return await work(manager);
    },
  );
  return { dataSource: { transaction } as unknown as DataSource, manager, transaction, events };
};

describe('AuthorizationSnapshotResolver', () => {
  it('uses one REPEATABLE READ transaction and returns canonical deduped byte-sorted actor roles', async () => {
    const world = buildDataSource();
    const resolver = new AuthorizationSnapshotResolver(world.dataSource, async () => world.events.push('barrier'));

    const snapshot = await resolver.Resolve('user-1');

    expect(world.transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(world.events).toEqual(['tx:REPEATABLE READ', 'roles', 'barrier', 'permissions', 'scopes']);
    expect(snapshot).toEqual({
      UserId: 'user-1',
      ActiveRoles: [
        { Id: 'role-2', RoleCode: 'OPERATOR' },
        { Id: 'role-1', RoleCode: 'WMS_ADMIN' },
      ],
      Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Role }],
      DataScopes: [
        {
          PrincipalType: PrincipalType.User,
          PrincipalId: 'user-1',
          ScopeType: DataScopeType.Warehouse,
          ScopeValueId: 'warehouse-1',
          IncludeAll: false,
        },
      ],
    });
  });

  it('wraps snapshot construction failures in the narrow typed error', async () => {
    const dataSource = {
      transaction: jest.fn(async () => {
        throw new Error('database unavailable');
      }),
    } as unknown as DataSource;

    const error = await new AuthorizationSnapshotResolver(dataSource).Resolve('user-1').catch((caught) => caught);
    expect(error).toBeInstanceOf(SnapshotResolutionError);
    expect(error.Details).toEqual({ Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' });
  });

  it('filters inactive assignments and returns a zero-role snapshot without grants', async () => {
    const calls: Array<{ Sql: string; Params: unknown[] }> = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        calls.push({ Sql: sql, Params: params });
        if (sql.includes('rh_aud_01_active_roles')) {
          const activeOnly = /WHERE\s+ur\.user_id = \$1\s+AND\s+r\.status = 'ACTIVE'/u.test(sql);
          return activeOnly ? [] : [{ Id: 'inactive-role', RoleCode: 'INACTIVE_ROLE' }];
        }
        if (sql.includes('rh_aud_01_permissions')) return [];
        if (sql.includes('rh_aud_01_data_scopes')) return [];
        throw new Error(`Unexpected query: ${sql}`);
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (_isolation: string, work: (value: EntityManager) => Promise<unknown>) =>
        work(manager),
      ),
    } as unknown as DataSource;

    const resolved = await new AuthorizationSnapshotResolver(dataSource).Resolve('inactive-only-user');

    expect(calls[0].Sql).toMatch(/WHERE\s+ur\.user_id = \$1\s+AND\s+r\.status = 'ACTIVE'/u);
    expect(calls[0].Params).toEqual(['inactive-only-user']);
    expect(calls[1].Params).toEqual([[]]);
    expect(resolved).toEqual({
      UserId: 'inactive-only-user',
      ActiveRoles: [],
      Permissions: [],
      DataScopes: [],
    });
    expect(AuthorizationSnapshotRoleCodes(resolved)).toEqual([]);
  });

  it('keeps every distinct role id for grants while deduping canonical audit role codes', async () => {
    const permissionRoleIds: string[][] = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        if (sql.includes('rh_aud_01_active_roles')) {
          return [
            { Id: 'role-1', RoleCode: 'custom_role' },
            { Id: 'role-2', RoleCode: 'CUSTOM_ROLE' },
          ];
        }
        if (sql.includes('rh_aud_01_permissions')) {
          permissionRoleIds.push(params[0] as string[]);
          return [];
        }
        if (sql.includes('rh_aud_01_data_scopes')) return [];
        throw new Error(`Unexpected query: ${sql}`);
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (_isolation: string, work: (value: EntityManager) => Promise<unknown>) =>
        work(manager),
      ),
    } as unknown as DataSource;

    const resolved = await new AuthorizationSnapshotResolver(dataSource).Resolve('user-1');
    expect(resolved.ActiveRoles).toEqual([
      { Id: 'role-1', RoleCode: 'CUSTOM_ROLE' },
      { Id: 'role-2', RoleCode: 'CUSTOM_ROLE' },
    ]);
    expect(permissionRoleIds).toEqual([['role-1', 'role-2']]);
    expect(AuthorizationSnapshotRoleCodes(resolved)).toEqual(['CUSTOM_ROLE']);
  });
});
