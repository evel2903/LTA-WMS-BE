import { EntityManager } from 'typeorm';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';

const makeManager = () => {
  const saved: Array<Record<string, unknown>> = [];
  const save = jest.fn(async (orm: Record<string, unknown>) => {
    saved.push(orm);
    return orm;
  });
  const manager = { getRepository: jest.fn(() => ({ save })) } as unknown as EntityManager;
  return { manager, saved, save };
};

const entry: AuditEntry = {
  ActorUserId: 'u1',
  ActorType: ActorType.User,
  Action: ActionCode.Create,
  ObjectType: ObjectType.Warehouse,
  ObjectId: 'wh1',
  AfterJson: { Name: 'WH' },
};

describe('AuditWriter.Append', () => {
  it('writes one audit row through the provided transaction manager (append-only)', async () => {
    const { manager, saved, save } = makeManager();
    await new AuditWriter().Append(entry, manager);
    expect(save).toHaveBeenCalledTimes(1);
    expect(saved[0]).toMatchObject({
      ActorUserId: 'u1',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Warehouse,
      ObjectId: 'wh1',
      Result: AuditResult.Success,
    });
    expect(saved[0].Id).toBeDefined();
  });

  it('defaults Result to SUCCESS and ActorRoleCodes to []', async () => {
    const { manager, saved } = makeManager();
    await new AuditWriter().Append(entry, manager);
    expect(saved[0].Result).toBe(AuditResult.Success);
    expect(saved[0].ActorRoleCodes).toEqual([]);
  });

  it('supports a SYSTEM actor with no ActorUserId', async () => {
    const { manager, saved } = makeManager();
    await new AuditWriter().Append(
      { ActorType: ActorType.System, Action: ActionCode.Update, ObjectType: ObjectType.WarehouseProfile },
      manager,
    );
    expect(saved[0]).toMatchObject({ ActorType: ActorType.System, ActorUserId: null });
  });
});
