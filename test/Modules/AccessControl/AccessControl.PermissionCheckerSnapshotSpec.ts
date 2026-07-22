import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { IAuthorizationSnapshotResolver } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';

const snapshot: AuthorizationSnapshot = {
  UserId: 'actor-1',
  ActiveRoles: [{ Id: 'role-1', RoleCode: 'WMS_ADMIN' }],
  Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Role }],
  DataScopes: [],
};

describe('PermissionChecker request authorization snapshot', () => {
  it('reuses the same-actor request snapshot without repository reads', async () => {
    const userRoles = { FindByUserId: jest.fn() };
    const rolePermissions = { FindByRoleIds: jest.fn() };
    const permissions = { FindByIds: jest.fn() };
    const dataScopes = { FindByPrincipals: jest.fn() };
    const roles = { FindByIds: jest.fn() };
    const requestContext = new AuthorizationSnapshotContext();
    const checker = new PermissionChecker(
      userRoles as never,
      rolePermissions as never,
      permissions as never,
      dataScopes as never,
      roles as never,
      requestContext,
    );

    await requestContext.Run(async () => {
      await requestContext.Resolve('actor-1', async () => snapshot);
      await expect(
        checker.Check({ UserId: 'actor-1', Action: ActionCode.Update, ObjectType: ObjectType.Role }),
      ).resolves.toEqual({ Allowed: true });
    });

    expect(userRoles.FindByUserId).not.toHaveBeenCalled();
    expect(roles.FindByIds).not.toHaveBeenCalled();
    expect(rolePermissions.FindByRoleIds).not.toHaveBeenCalled();
    expect(permissions.FindByIds).not.toHaveBeenCalled();
    expect(dataScopes.FindByPrincipals).not.toHaveBeenCalled();
  });

  it('memoizes concurrent same-actor resolution and publishes the exact resolved object', async () => {
    const requestContext = new AuthorizationSnapshotContext();
    const factory = jest.fn().mockResolvedValue(snapshot);

    await requestContext.Run(async () => {
      const [first, second] = await Promise.all([
        requestContext.Resolve('actor-1', factory),
        requestContext.Resolve('actor-1', factory),
      ]);
      expect(first).toBe(snapshot);
      expect(second).toBe(snapshot);
      expect(requestContext.Get('actor-1')).toBe(snapshot);
    });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('rejects a resolver result whose UserId does not match the memoization key', async () => {
    const requestContext = new AuthorizationSnapshotContext();
    await requestContext.Run(async () => {
      await expect(
        requestContext.Resolve('actor-1', async () => ({ ...snapshot, UserId: 'actor-2' })),
      ).rejects.toMatchObject({ Details: { Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' } });
      expect(requestContext.Get('actor-1')).toBeUndefined();
    });
  });

  it('rejects a resolver result whose UserId differs even without an ALS store', async () => {
    const requestContext = new AuthorizationSnapshotContext();
    await expect(
      requestContext.Resolve('actor-1', async () => ({ ...snapshot, UserId: 'actor-2' })),
    ).rejects.toMatchObject({ Details: { Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' } });
  });

  it('cold-resolves the authoritative snapshot for a bound same-actor HTTP checker call', async () => {
    const userRoles = { FindByUserId: jest.fn() };
    const repositories = [
      userRoles,
      { FindByRoleIds: jest.fn() },
      { FindByIds: jest.fn() },
      { FindByPrincipals: jest.fn() },
      { FindByIds: jest.fn() },
    ];
    const requestContext = new AuthorizationSnapshotContext();
    const resolver: IAuthorizationSnapshotResolver = { Resolve: jest.fn().mockResolvedValue(snapshot) };
    const CheckerConstructor = PermissionChecker as unknown as new (
      ...args: [never, never, never, never, never, AuthorizationSnapshotContext, IAuthorizationSnapshotResolver]
    ) => PermissionChecker;
    const checker = new CheckerConstructor(
      repositories[0] as never,
      repositories[1] as never,
      repositories[2] as never,
      repositories[3] as never,
      repositories[4] as never,
      requestContext,
      resolver,
    );

    await requestContext.Run(async () => {
      (requestContext as unknown as { BindActor(userId: string): void }).BindActor('actor-1');
      await expect(
        checker.Check({ UserId: 'actor-1', Action: ActionCode.Update, ObjectType: ObjectType.Role }),
      ).resolves.toEqual({ Allowed: true });
    });
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
    expect(userRoles.FindByUserId).not.toHaveBeenCalled();
  });

  it('reuses snapshot scopes for ResolveDataScope without repository reads', async () => {
    const scopedSnapshot: AuthorizationSnapshot = {
      ...snapshot,
      DataScopes: [
        {
          PrincipalType: PrincipalType.User,
          PrincipalId: 'actor-1',
          ScopeType: DataScopeType.Warehouse,
          ScopeValueId: 'warehouse-1',
          IncludeAll: false,
        },
      ],
    };
    const userRoles = { FindByUserId: jest.fn() };
    const rolePermissions = { FindByRoleIds: jest.fn() };
    const permissions = { FindByIds: jest.fn() };
    const dataScopes = { FindByPrincipals: jest.fn() };
    const roles = { FindByIds: jest.fn() };
    const requestContext = new AuthorizationSnapshotContext();
    const checker = new PermissionChecker(
      userRoles as never,
      rolePermissions as never,
      permissions as never,
      dataScopes as never,
      roles as never,
      requestContext,
    );

    await requestContext.Run(async () => {
      await requestContext.Resolve('actor-1', async () => scopedSnapshot);
      await expect(
        checker.ResolveDataScope({ UserId: 'actor-1', Action: ActionCode.Update, ObjectType: ObjectType.Role }),
      ).resolves.toMatchObject({ Allowed: true, WarehouseIds: ['warehouse-1'], OwnerIds: [] });
    });
    expect(userRoles.FindByUserId).not.toHaveBeenCalled();
    expect(dataScopes.FindByPrincipals).not.toHaveBeenCalled();
  });

  it('never lends an actor snapshot to a different target user', async () => {
    const userRoles = { FindByUserId: jest.fn().mockResolvedValue([]) };
    const requestContext = new AuthorizationSnapshotContext();
    const checker = new PermissionChecker(
      userRoles as never,
      { FindByRoleIds: jest.fn() } as never,
      { FindByIds: jest.fn() } as never,
      { FindByPrincipals: jest.fn() } as never,
      { FindByIds: jest.fn() } as never,
      requestContext,
    );

    await requestContext.Run(async () => {
      await requestContext.Resolve('actor-1', async () => snapshot);
      await expect(
        checker.Check({ UserId: 'actor-2', Action: ActionCode.Update, ObjectType: ObjectType.Role }),
      ).resolves.toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
    });
    expect(userRoles.FindByUserId).toHaveBeenCalledWith('actor-2');
  });

  it('denies a malformed snapshot with permissions but no active roles', async () => {
    const checker = new PermissionChecker(
      { FindByUserId: jest.fn() } as never,
      { FindByRoleIds: jest.fn() } as never,
      { FindByIds: jest.fn() } as never,
      { FindByPrincipals: jest.fn() } as never,
      { FindByIds: jest.fn() } as never,
    );
    await expect(
      checker.Check(
        { UserId: 'actor-1', Action: ActionCode.Update, ObjectType: ObjectType.Role },
        { ...snapshot, ActiveRoles: [] },
      ),
    ).resolves.toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
  });
});
