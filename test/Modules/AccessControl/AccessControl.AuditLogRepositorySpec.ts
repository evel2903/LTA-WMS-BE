import { AuditLogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/AuditLogRepository';

describe('AuditLogRepository (read-only)', () => {
  it('exposes no update/delete surface (append-only)', () => {
    const repo = new AuditLogRepository({} as never) as unknown as Record<string, unknown>;
    expect(typeof repo.FindById).toBe('function');
    expect(typeof repo.Query).toBe('function');
    expect(repo.Update).toBeUndefined();
    expect(repo.Delete).toBeUndefined();
    expect(repo.Save).toBeUndefined();
  });

  it('FindById returns null when not found', async () => {
    const orm = { findOne: jest.fn(async () => null) } as never;
    expect(await new AuditLogRepository(orm).FindById('missing')).toBeNull();
  });
});
