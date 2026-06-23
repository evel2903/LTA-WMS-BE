import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ListUserDataScopesUseCase } from '@modules/AccessControl/Application/UseCases/ListUserDataScopesUseCase';
import { AssignDataScopeToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignDataScopeToUserUseCase';
import { RemoveDataScopeFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveDataScopeFromUserUseCase';
import {
  InMemoryDataScopeRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const ctx: AuditContext = {
  ActorUserId: 'admin-1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-ds',
  RequestId: 'req-ds',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const buildWorld = () => {
  const dataScopes = new InMemoryDataScopeRepository();
  return {
    dataScopes,
    list: new ListUserDataScopesUseCase(dataScopes),
    assign: new AssignDataScopeToUserUseCase(dataScopes),
    remove: new RemoveDataScopeFromUserUseCase(dataScopes),
  };
};

describe('AssignDataScopeToUserUseCase / RemoveDataScopeFromUserUseCase / ListUserDataScopesUseCase', () => {
  it('assigns an IncludeAll data scope to a user', async () => {
    const world = buildWorld();
    const userId = randomUUID();

    const result = await world.assign.Execute({ UserId: userId, ScopeType: DataScopeType.Warehouse, IncludeAll: true });

    expect(result.ScopeType).toBe(DataScopeType.Warehouse);
    expect(result.IncludeAll).toBe(true);
    expect(result.ScopeValueId).toBeNull();
    expect(await world.list.Execute(userId)).toHaveLength(1);
  });

  it('assigns a concrete-value data scope to a user', async () => {
    const world = buildWorld();
    const userId = randomUUID();

    const result = await world.assign.Execute({
      UserId: userId,
      ScopeType: DataScopeType.Owner,
      ScopeValueId: 'owner-9',
      ScopeValueCode: 'OWN-9',
    });

    expect(result.IncludeAll).toBe(false);
    expect(result.ScopeValueId).toBe('owner-9');
    expect(result.ScopeValueCode).toBe('OWN-9');
  });

  it('rejects a scope that sets IncludeAll together with a value', async () => {
    const world = buildWorld();
    await expect(
      world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Zone, ScopeValueId: 'z1', IncludeAll: true }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects a scope with neither IncludeAll nor a value', async () => {
    const world = buildWorld();
    await expect(world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Zone })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('rejects a duplicate scope with Conflict', async () => {
    const world = buildWorld();
    await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Warehouse, ScopeValueId: 'wh-1' });
    await expect(
      world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Warehouse, ScopeValueId: 'wh-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows the same scope value for a different scope type', async () => {
    const world = buildWorld();
    await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Warehouse, ScopeValueId: 'x' });
    const second = await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Zone, ScopeValueId: 'x' });
    expect(second.ScopeType).toBe(DataScopeType.Zone);
    expect(await world.list.Execute('u1')).toHaveLength(2);
  });

  it('allows two distinct code-only scopes of the same type (both ScopeValueId null)', async () => {
    const world = buildWorld();
    await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Owner, ScopeValueCode: 'OWN-1' });
    const second = await world.assign.Execute({
      UserId: 'u1',
      ScopeType: DataScopeType.Owner,
      ScopeValueCode: 'OWN-2',
    });
    expect(second.ScopeValueCode).toBe('OWN-2');
    expect(await world.list.Execute('u1')).toHaveLength(2);
  });

  it('rejects the SAME code-only scope twice with Conflict', async () => {
    const world = buildWorld();
    await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Owner, ScopeValueCode: 'OWN-1' });
    await expect(
      world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Owner, ScopeValueCode: 'OWN-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists only the scopes belonging to the requested user', async () => {
    const world = buildWorld();
    await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Warehouse, IncludeAll: true });
    await world.assign.Execute({ UserId: 'u2', ScopeType: DataScopeType.Owner, IncludeAll: true });

    const u1 = await world.list.Execute('u1');
    expect(u1).toHaveLength(1);
    expect(u1[0].ScopeType).toBe(DataScopeType.Warehouse);
  });

  it('removes a scope belonging to the user', async () => {
    const world = buildWorld();
    const created = await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Owner, ScopeValueId: 'o1' });

    const result = await world.remove.Execute({ UserId: 'u1', ScopeId: created.Id });
    expect(result.Removed).toBe(true);
    expect(await world.list.Execute('u1')).toHaveLength(0);
  });

  it('rejects removing a scope that does not belong to the user with NotFound', async () => {
    const world = buildWorld();
    const created = await world.assign.Execute({ UserId: 'u1', ScopeType: DataScopeType.Owner, ScopeValueId: 'o1' });

    await expect(world.remove.Execute({ UserId: 'u2', ScopeId: created.Id })).rejects.toBeInstanceOf(NotFoundException);
    await expect(world.remove.Execute({ UserId: 'u1', ScopeId: 'nope' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DataScope mutations write audit (C5 wired path)', () => {
  it('AssignDataScope writes a Create UserAssignment entry with the user + scope in the after-image', async () => {
    const stub = new StubAuditedTransaction();
    const dataScopes = new InMemoryDataScopeRepository();
    const useCase = new AssignDataScopeToUserUseCase(dataScopes, stub as unknown as AuditedTransaction);

    await useCase.Execute({ UserId: 'user-42', ScopeType: DataScopeType.Warehouse, ScopeValueId: 'wh-7' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.UserAssignment,
        ObjectCode: DataScopeType.Warehouse,
        ActorUserId: 'admin-1',
        CorrelationId: 'corr-ds',
      }),
    );
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ UserId: 'user-42', ScopeValueId: 'wh-7' }));
    // The write actually landed in the repository.
    expect(await dataScopes.FindByPrincipal('USER' as never, 'user-42')).toHaveLength(1);
  });

  it('RemoveDataScope writes a DeleteCancel UserAssignment entry with the before-image', async () => {
    const stub = new StubAuditedTransaction();
    const dataScopes = new InMemoryDataScopeRepository();
    const assign = new AssignDataScopeToUserUseCase(dataScopes, stub as unknown as AuditedTransaction);
    const created = await assign.Execute(
      { UserId: 'user-42', ScopeType: DataScopeType.Owner, ScopeValueId: 'o-1' },
      ctx,
    );
    stub.Entries.length = 0;

    const useCase = new RemoveDataScopeFromUserUseCase(dataScopes, stub as unknown as AuditedTransaction);
    await useCase.Execute({ UserId: 'user-42', ScopeId: created.Id }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.UserAssignment,
        ActorUserId: 'admin-1',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual(
      expect.objectContaining({ Id: created.Id, UserId: 'user-42', ScopeValueId: 'o-1' }),
    );
  });
});
