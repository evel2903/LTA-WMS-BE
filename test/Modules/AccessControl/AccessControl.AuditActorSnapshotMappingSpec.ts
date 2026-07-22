import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditLogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/AuditLogOrmMapper';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';

describe('audit actor snapshot provenance mapping', () => {
  it('round-trips unresolved role codes as explicit null', () => {
    const orm = AuditLogOrmMapper.FromEntry({
      ActorUserId: 'actor-1',
      ActorRoleCodes: null,
      ActorSnapshotStatus: ActorSnapshotStatus.Unresolved,
      ActorType: ActorType.User,
      Action: ActionCode.Read,
      ObjectType: ObjectType.Role,
    });

    expect(orm.ActorRoleCodes).toBeNull();
    expect(orm.ActorSnapshotStatus).toBe(ActorSnapshotStatus.Unresolved);
    orm.OccurredAt = new Date('2026-07-22T00:00:00.000Z');
    const domain = AuditLogOrmMapper.ToDomain(orm);
    expect(domain.ActorRoleCodes).toBeNull();
    expect(domain.ActorSnapshotStatus).toBe(ActorSnapshotStatus.Unresolved);
  });

  it('keeps resolved zero-role distinct from unresolved', () => {
    const orm = AuditLogOrmMapper.FromEntry({
      ActorUserId: 'actor-1',
      ActorRoleCodes: [],
      ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
      ActorType: ActorType.User,
      Action: ActionCode.Read,
      ObjectType: ObjectType.Role,
    });
    expect(orm.ActorRoleCodes).toEqual([]);
    expect(orm.ActorSnapshotStatus).toBe(ActorSnapshotStatus.Resolved);
  });

  it('marks omitted compatibility provenance as legacy_unverified instead of resolved', () => {
    const orm = AuditLogOrmMapper.FromEntry({
      ActorType: ActorType.System,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Warehouse,
    });
    expect(orm.ActorRoleCodes).toEqual([]);
    expect(orm.ActorSnapshotStatus).toBe(ActorSnapshotStatus.LegacyUnverified);
  });

  it('rejects an explicit resolved status when role codes were omitted', () => {
    expect(() =>
      AuditLogOrmMapper.FromEntry({
        ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
        ActorType: ActorType.User,
        Action: ActionCode.Read,
        ObjectType: ObjectType.Role,
      }),
    ).toThrow('provenance');
    expect(
      () =>
        new AuditLogEntity({
          Id: 'audit-missing-codes',
          OccurredAt: new Date(),
          ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
          ActorType: ActorType.User,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Role,
        }),
    ).toThrow('provenance');
  });

  it('rejects impossible provenance combinations at the domain boundary', () => {
    expect(
      () =>
        new AuditLogEntity({
          Id: 'audit-1',
          OccurredAt: new Date(),
          ActorRoleCodes: null,
          ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
          ActorType: ActorType.User,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Role,
          Result: AuditResult.Failed,
        }),
    ).toThrow('provenance');
    expect(
      () =>
        new AuditLogEntity({
          Id: 'audit-2',
          OccurredAt: new Date(),
          ActorSnapshotStatus: ActorSnapshotStatus.Unresolved,
          ActorType: ActorType.User,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Role,
        }),
    ).toThrow('provenance');
  });
});
