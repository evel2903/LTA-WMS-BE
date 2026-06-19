import { randomUUID } from 'crypto';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import { QueryAuditLogsUseCase } from '@modules/AccessControl/Application/UseCases/QueryAuditLogsUseCase';
import { InMemoryAuditLogRepository } from '@modules/AccessControl/Test/AccessControlTestDoubles';

const log = (overrides: Partial<AuditLogEntity> & { OccurredAt: Date }) =>
  new AuditLogEntity({
    Id: randomUUID(),
    ActorType: ActorType.User,
    Action: ActionCode.Create,
    ObjectType: ObjectType.Warehouse,
    ...overrides,
  } as ConstructorParameters<typeof AuditLogEntity>[0]);

describe('QueryAuditLogsUseCase', () => {
  const build = async () => {
    const repo = new InMemoryAuditLogRepository();
    await repo.Seed(log({ ActorUserId: 'a', Action: ActionCode.Create, OccurredAt: new Date('2026-01-01') }));
    await repo.Seed(log({ ActorUserId: 'b', Action: ActionCode.Update, OccurredAt: new Date('2026-03-01') }));
    await repo.Seed(log({ ActorUserId: 'a', Action: ActionCode.Update, OccurredAt: new Date('2026-02-01') }));
    return new QueryAuditLogsUseCase(repo);
  };

  it('filters by actor', async () => {
    const useCase = await build();
    const result = await useCase.Execute({ ActorUserId: 'a' });
    expect(result.Meta.TotalItems).toBe(2);
    expect(result.Items.every((i) => i.ActorUserId === 'a')).toBe(true);
  });

  it('filters by action', async () => {
    const useCase = await build();
    const result = await useCase.Execute({ Action: ActionCode.Update });
    expect(result.Meta.TotalItems).toBe(2);
  });

  it('filters by time window', async () => {
    const useCase = await build();
    const result = await useCase.Execute({ From: new Date('2026-02-15'), To: new Date('2026-12-31') });
    expect(result.Meta.TotalItems).toBe(1);
  });

  it('sorts by OccurredAt DESC and paginates', async () => {
    const useCase = await build();
    const result = await useCase.Execute({ Page: 1, PageSize: 2 });
    expect(result.Items).toHaveLength(2);
    expect(result.Items[0].OccurredAt.getTime()).toBeGreaterThanOrEqual(result.Items[1].OccurredAt.getTime());
    expect(result.Meta.TotalPages).toBe(2);
  });

  it('filters by object type, object id and reason code', async () => {
    const repo = new InMemoryAuditLogRepository();
    await repo.Seed(
      log({
        ObjectType: ObjectType.Warehouse,
        ObjectId: 'wh1',
        ReasonCodeId: 'rc1',
        OccurredAt: new Date('2026-01-01'),
      }),
    );
    await repo.Seed(
      log({ ObjectType: ObjectType.Zone, ObjectId: 'z1', ReasonCodeId: 'rc2', OccurredAt: new Date('2026-01-02') }),
    );
    const useCase = new QueryAuditLogsUseCase(repo);
    expect((await useCase.Execute({ ObjectType: ObjectType.Warehouse })).Meta.TotalItems).toBe(1);
    expect((await useCase.Execute({ ObjectId: 'z1' })).Meta.TotalItems).toBe(1);
    expect((await useCase.Execute({ ReasonCodeId: 'rc1' })).Meta.TotalItems).toBe(1);
  });
});
