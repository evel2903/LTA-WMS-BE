import { DataSource, EntityManager } from 'typeorm';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { FakeAuditWriter } from '@modules/AccessControl/Test/AccessControlTestDoubles';

/**
 * Always-run (no-DB) proof of the C5 atomicity contract for AuditedTransaction.Run: the audit
 * entry is appended via the SAME EntityManager the work callback used, inside one transaction,
 * and a failure in either the command work or the audit append rejects the whole unit (so a real
 * DataSource.transaction would roll back both). The live MasterData.C5AuditIntegrationSpec proves
 * this end-to-end against Postgres; this spec guarantees it without a database.
 */
const fakeManager = { id: 'tx-manager' } as unknown as EntityManager;

// Mock DataSource.transaction = run the callback with the tx manager and propagate any rejection
// (mirroring TypeORM: a throwing callback rejects the transaction → rollback).
const dataSourceWith = (): DataSource =>
  ({
    transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(fakeManager)),
  }) as unknown as DataSource;

const entry: AuditEntry = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  Action: ActionCode.Create,
  ObjectType: ObjectType.Warehouse,
  ObjectId: 'wh-1',
  ObjectCode: 'WH-1',
  AfterJson: { WarehouseCode: 'WH-1' },
};

describe('AuditedTransaction.Run (C5 atomicity, no DB)', () => {
  it('appends the audit entry with the same manager the work used, and returns the result', async () => {
    const writer = new FakeAuditWriter();
    const appendSpy = jest.spyOn(writer, 'Append');
    const audited = new AuditedTransaction(dataSourceWith(), writer);

    let managerSeenByWork: EntityManager | undefined;
    const result = await audited.Run(async (manager) => {
      managerSeenByWork = manager;
      return { result: { Id: 'wh-1' }, entry };
    });

    expect(result).toEqual({ Id: 'wh-1' });
    expect(managerSeenByWork).toBe(fakeManager);
    expect(writer.Entries).toHaveLength(1);
    expect(writer.Entries[0]).toBe(entry);
    expect(appendSpy).toHaveBeenCalledWith(entry, fakeManager);
  });

  it('rejects (rolls back) and does NOT append when the command work throws', async () => {
    const writer = new FakeAuditWriter();
    const audited = new AuditedTransaction(dataSourceWith(), writer);

    await expect(
      audited.Run(async () => {
        throw new Error('command failed');
      }),
    ).rejects.toThrow('command failed');
    expect(writer.Entries).toHaveLength(0);
  });

  it('rejects (rolls back) when the audit append itself fails', async () => {
    const writer = new FakeAuditWriter();
    jest.spyOn(writer, 'Append').mockRejectedValueOnce(new Error('append failed'));
    const audited = new AuditedTransaction(dataSourceWith(), writer);

    await expect(audited.Run(async () => ({ result: { Id: 'wh-1' }, entry }))).rejects.toThrow('append failed');
  });
});
