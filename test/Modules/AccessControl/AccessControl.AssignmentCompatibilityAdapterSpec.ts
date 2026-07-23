import { randomUUID } from 'crypto';
import { HttpStatus } from '@nestjs/common';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { AppException } from '@common/Exceptions/AppException';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AssignmentLedgerRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/AssignmentLedgerRepository';
import { RegisterAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/RegisterAssignmentIntentUseCase';
import { GetAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/GetAssignmentIntentUseCase';
import { ApplyAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/ApplyAssignmentIntentUseCase';
import { AssignmentCompatibilityAdapter } from '@modules/AccessControl/Application/Services/AssignmentCompatibilityAdapter';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

/**
 * RH-04 (RH-ASG-01 / D3) dual-protocol compatibility adapter (AC9 old-FE/new-BE, AC10 evidence).
 * Unit tests pin the bounded-retry-on-supersede fencing (Review Finding, round 1) deterministically;
 * live-Postgres tests prove a ticketless legacy assign/remove drives the real head/version/audit seam.
 */
describe('RH-04 AssignmentCompatibilityAdapter', () => {
  const stale = () =>
    new AppException('stale', HttpStatus.CONFLICT, ErrorCode.IntentStale, { CurrentRunId: randomUUID() });
  const roleAlreadyAssigned = () => new AppException('dup', HttpStatus.CONFLICT, ErrorCode.RoleAlreadyAssigned, {});
  const registerOk = {
    Replay: false,
    Data: {
      RunId: 'r',
      Operation: 'assign',
      Status: 'Registered',
      IntentVersion: '1',
      EffectiveVersion: '0',
      IsCurrent: true,
    },
  };
  const fakeRegister = () => ({ Execute: jest.fn().mockResolvedValue(registerOk) });

  describe('bounded retry on 409 IntentStale (synthetic ticket superseded between register and apply)', () => {
    it('re-registers and re-applies when apply throws IntentStale, then returns the eventual body', async () => {
      const register = fakeRegister();
      const apply = {
        Execute: jest
          .fn()
          .mockRejectedValueOnce(stale())
          .mockResolvedValueOnce({ Body: { Assigned: true, RoleCode: 'OPERATOR' } }),
      };
      const adapter = new AssignmentCompatibilityAdapter(
        register as unknown as RegisterAssignmentIntentUseCase,
        apply as unknown as ApplyAssignmentIntentUseCase,
      );

      const result = await adapter.LegacyAssign({ ActorUserId: 'a', UserId: 'u', RoleCode: 'operator' });

      expect(result.RoleCode).toBe('OPERATOR');
      expect(register.Execute).toHaveBeenCalledTimes(2); // one fresh synthetic RunId per attempt
      expect(apply.Execute).toHaveBeenCalledTimes(2);
    });

    it('gives up after the retry cap and throws the last IntentStale rather than looping forever', async () => {
      const register = fakeRegister();
      const apply = { Execute: jest.fn().mockRejectedValue(stale()) };
      const adapter = new AssignmentCompatibilityAdapter(
        register as unknown as RegisterAssignmentIntentUseCase,
        apply as unknown as ApplyAssignmentIntentUseCase,
      );

      await expect(adapter.LegacyRemove({ ActorUserId: 'a', UserId: 'u', RoleCode: 'operator' })).rejects.toMatchObject(
        {
          ErrorCode: ErrorCode.IntentStale,
        },
      );
      expect(register.Execute).toHaveBeenCalledTimes(5); // MAX_STALE_RETRIES
    });

    it('propagates a non-stale terminal outcome (RoleAlreadyAssigned) immediately, without retry', async () => {
      const register = fakeRegister();
      const apply = { Execute: jest.fn().mockRejectedValue(roleAlreadyAssigned()) };
      const adapter = new AssignmentCompatibilityAdapter(
        register as unknown as RegisterAssignmentIntentUseCase,
        apply as unknown as ApplyAssignmentIntentUseCase,
      );

      await expect(adapter.LegacyAssign({ ActorUserId: 'a', UserId: 'u', RoleCode: 'operator' })).rejects.toMatchObject(
        {
          ErrorCode: ErrorCode.RoleAlreadyAssigned,
        },
      );
      expect(register.Execute).toHaveBeenCalledTimes(1); // no retry on a legitimate terminal 409
    });
  });

  describe('live Postgres — ticketless legacy assign/remove through the real seam', () => {
    let available = false;
    let adapter: AssignmentCompatibilityAdapter;
    let recover: GetAssignmentIntentUseCase;
    const ROLE = 'OPERATOR';
    const createdUsers: string[] = [];

    const ctx = (actor: string): AuditContext => ({
      ActorUserId: actor,
      ActorRoleCodes: ['WMS_ADMIN'],
      ActorType: ActorType.User,
      CorrelationId: randomUUID(),
      RequestId: randomUUID(),
      IpAddress: '127.0.0.1',
      UserAgent: 'jest-rh04-adapter',
    });

    const freshUser = async (): Promise<string> => {
      const id = randomUUID();
      await dataSource.getRepository(UserOrmEntity).insert({
        Id: id,
        FirstName: 'RH04',
        LastName: 'Adapter',
        EmailAddress: `rh04-adapter-${id}@test.local`,
        PasswordHash: null,
        Role: 'User',
      });
      createdUsers.push(id);
      return id;
    };

    beforeAll(async () => {
      try {
        if (!dataSource.isInitialized) await dataSource.initialize();
        await dataSource.runMigrations();
        available = true;
      } catch (e) {
        available = false;
        console.warn('[RH04 adapter] no Postgres reachable — skipping live assertions:', (e as Error).message);
      }
      if (!available) return;
      const ledger = new AssignmentLedgerRepository();
      const register = new RegisterAssignmentIntentUseCase(dataSource, ledger);
      const apply = new ApplyAssignmentIntentUseCase(ledger, new AuditedTransaction(dataSource, new AuditWriter()));
      recover = new GetAssignmentIntentUseCase(dataSource, ledger);
      adapter = new AssignmentCompatibilityAdapter(register, apply);
    });

    afterAll(async () => {
      if (!available) return;
      for (const id of createdUsers) {
        await dataSource.query('DELETE FROM user_role_assignment_intents WHERE user_id = $1', [id]);
        await dataSource.query('DELETE FROM user_role_assignment_heads WHERE user_id = $1', [id]);
        await dataSource.query('DELETE FROM user_effective_versions WHERE user_id = $1', [id]);
        await dataSource.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        await dataSource.query('DELETE FROM users WHERE id = $1', [id]);
      }
    });

    it('legacy assign then remove drive the head/version seam and stay idempotent', async () => {
      if (!available) return;
      const actor = randomUUID();
      const userId = await freshUser();

      const assigned = await adapter.LegacyAssign(
        { ActorUserId: actor, UserId: userId, RoleCode: 'operator' },
        ctx(actor),
      );
      expect(assigned.RoleCode).toBe(ROLE);
      expect(assigned.Source).toBe('MANUAL');

      const afterAssign = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
      expect(afterAssign.AssignedRoleCodes).toContain(ROLE);
      expect(afterAssign.EffectiveVersion).toBe('1'); // real assign bumped 0 -> 1 via the seam

      // Duplicate legacy assign is a legitimate terminal 409 — propagates, not retried into a loop.
      await expect(
        adapter.LegacyAssign({ ActorUserId: actor, UserId: userId, RoleCode: 'operator' }, ctx(actor)),
      ).rejects.toMatchObject({ ErrorCode: ErrorCode.RoleAlreadyAssigned });
      const afterDup = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
      expect(afterDup.EffectiveVersion).toBe('1'); // duplicate did not bump

      const removed = await adapter.LegacyRemove(
        { ActorUserId: actor, UserId: userId, RoleCode: 'operator' },
        ctx(actor),
      );
      expect(removed.Removed).toBe(true);
      const afterRemove = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
      expect(afterRemove.AssignedRoleCodes).not.toContain(ROLE);
      expect(afterRemove.EffectiveVersion).toBe('2'); // real remove bumped 1 -> 2

      // Idempotent legacy remove (already absent): no throw, no bump.
      const removedAgain = await adapter.LegacyRemove(
        { ActorUserId: actor, UserId: userId, RoleCode: 'operator' },
        ctx(actor),
      );
      expect(removedAgain.Removed).toBe(false);
      const afterIdempotent = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
      expect(afterIdempotent.EffectiveVersion).toBe('2'); // unchanged
    });
  });
});
