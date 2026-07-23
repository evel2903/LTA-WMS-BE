import { randomUUID } from 'crypto';
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
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

/**
 * RH-04 (RH-ASG-01 / D3) server-fenced intent protocol — live Postgres. Proves the register/apply/
 * recovery lifecycle, EffectiveVersion bump-only-on-real-change, duplicate/idempotent no-op,
 * transport replay, last-registration supersede fencing, actor-bound apply, and unknown 404s.
 */
describe('RH-04 assignment intent protocol (live Postgres)', () => {
  let available = false;
  let register: RegisterAssignmentIntentUseCase;
  let recover: GetAssignmentIntentUseCase;
  let apply: ApplyAssignmentIntentUseCase;
  const ROLE = 'OPERATOR'; // seeded canonical role
  const createdUsers: string[] = [];

  const ctx = (actor: string): AuditContext => ({
    ActorUserId: actor,
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    CorrelationId: randomUUID(),
    RequestId: randomUUID(),
    IpAddress: '127.0.0.1',
    UserAgent: 'jest-rh04',
  });

  const freshUser = async (): Promise<string> => {
    const id = randomUUID();
    await dataSource.getRepository(UserOrmEntity).insert({
      Id: id,
      FirstName: 'RH04',
      LastName: 'Fixture',
      EmailAddress: `rh04-${id}@test.local`,
      PasswordHash: null,
      Role: 'User',
    });
    createdUsers.push(id);
    return id;
  };

  const errorCodeOf = async (fn: () => Promise<unknown>): Promise<{ status: number; code: unknown }> => {
    try {
      await fn();
      throw new Error('expected throw');
    } catch (e) {
      const ex = e as AppException;
      return { status: ex.StatusCode, code: ex.ErrorCode };
    }
  };

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch (e) {
      available = false;
      console.warn('[RH04 intent] no Postgres reachable — skipping live assertions:', (e as Error).message);
    }
    if (!available) return;
    const ledger = new AssignmentLedgerRepository();
    register = new RegisterAssignmentIntentUseCase(dataSource, ledger);
    recover = new GetAssignmentIntentUseCase(dataSource, ledger);
    apply = new ApplyAssignmentIntentUseCase(ledger, new AuditedTransaction(dataSource, new AuditWriter()));
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

  it('register -> apply assign -> recovery -> duplicate -> replay -> remove -> idempotent remove', async () => {
    if (!available) return;
    const actor = randomUUID();
    const userId = await freshUser();

    // register assign: version 1, effective still 0 (registration does not apply)
    const runA = randomUUID();
    const reg = await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: 'operator',
      Operation: 'assign',
      RunId: runA,
    });
    expect(reg.Replay).toBe(false);
    expect(reg.Data.IntentVersion).toBe('1');
    expect(reg.Data.EffectiveVersion).toBe('0');

    // apply assign: Applied, effective 1
    const applied = await apply.Execute(
      {
        ActorUserId: actor,
        UserId: userId,
        CanonicalRoleCodeRaw: 'Operator',
        Operation: 'assign',
        RunId: runA,
        IntentVersion: '1',
      },
      ctx(actor),
    );
    expect(applied.Body.Assigned).toBe(true);
    expect(applied.Body.Status).toBe('Applied');
    expect(applied.Body.EffectiveVersion).toBe('1');

    // recovery: role present, version 1, owned by actor
    const snap = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
    expect(snap.AssignedRoleCodes).toContain(ROLE);
    expect(snap.EffectiveVersion).toBe('1');
    expect(snap.IsOwnedByCurrentActor).toBe(true);

    // duplicate assign (new ticket): 409 ROLE_ALREADY_ASSIGNED, no bump, intent SatisfiedNoChange
    const runDup = randomUUID();
    await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'assign',
      RunId: runDup,
    });
    const dup = await errorCodeOf(() =>
      apply.Execute(
        {
          ActorUserId: actor,
          UserId: userId,
          CanonicalRoleCodeRaw: ROLE,
          Operation: 'assign',
          RunId: runDup,
          IntentVersion: '2',
        },
        ctx(actor),
      ),
    );
    expect(dup.status).toBe(409);
    expect(dup.code).toBe(ErrorCode.RoleAlreadyAssigned);
    const afterDup = await recover.Execute({ ActorUserId: actor, UserId: userId, CanonicalRoleCodeRaw: ROLE });
    expect(afterDup.EffectiveVersion).toBe('1'); // unchanged

    // transport replay of the first (terminal Applied) ticket returns the persisted outcome
    const replay = await apply.Execute(
      {
        ActorUserId: actor,
        UserId: userId,
        CanonicalRoleCodeRaw: ROLE,
        Operation: 'assign',
        RunId: runA,
        IntentVersion: '1',
      },
      ctx(actor),
    );
    expect(replay.Body.Status).toBe('Applied');
    expect(replay.Body.EffectiveVersion).toBe('1');

    // remove: Removed true, effective 2
    const runR = randomUUID();
    const regR = await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'remove',
      RunId: runR,
    });
    const removed = await apply.Execute(
      {
        ActorUserId: actor,
        UserId: userId,
        CanonicalRoleCodeRaw: ROLE,
        Operation: 'remove',
        RunId: runR,
        IntentVersion: regR.Data.IntentVersion,
      },
      ctx(actor),
    );
    expect(removed.Body.Removed).toBe(true);
    expect(removed.Body.EffectiveVersion).toBe('2'); // assign bumped 0->1, real remove 1->2 (duplicate no-op did not bump)

    // idempotent remove (absent now): Removed false, SatisfiedNoChange, no bump
    const runR2 = randomUUID();
    const regR2 = await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'remove',
      RunId: runR2,
    });
    const removedAgain = await apply.Execute(
      {
        ActorUserId: actor,
        UserId: userId,
        CanonicalRoleCodeRaw: ROLE,
        Operation: 'remove',
        RunId: runR2,
        IntentVersion: regR2.Data.IntentVersion,
      },
      ctx(actor),
    );
    expect(removedAgain.Body.Removed).toBe(false);
    expect(removedAgain.Body.Status).toBe('SatisfiedNoChange');
    expect(removedAgain.Body.EffectiveVersion).toBe('2'); // unchanged (absent remove is a no-op)
  });

  it('last-registration supersede: applying a superseded ticket is 409 IntentStale', async () => {
    if (!available) return;
    const actor = randomUUID();
    const userId = await freshUser();
    const runA = randomUUID();
    const runB = randomUUID();
    const regA = await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'assign',
      RunId: runA,
    });
    await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'assign',
      RunId: runB,
    }); // supersedes A
    const stale = await errorCodeOf(() =>
      apply.Execute(
        {
          ActorUserId: actor,
          UserId: userId,
          CanonicalRoleCodeRaw: ROLE,
          Operation: 'assign',
          RunId: runA,
          IntentVersion: regA.Data.IntentVersion,
        },
        ctx(actor),
      ),
    );
    expect(stale.status).toBe(409);
    expect(stale.code).toBe(ErrorCode.IntentStale);
  });

  it('apply is actor-bound: 403 INTENT_ACTOR_MISMATCH for a different actor', async () => {
    if (!available) return;
    const actor = randomUUID();
    const userId = await freshUser();
    const runId = randomUUID();
    const reg = await register.Execute({
      ActorUserId: actor,
      UserId: userId,
      CanonicalRoleCodeRaw: ROLE,
      Operation: 'assign',
      RunId: runId,
    });
    const mismatch = await errorCodeOf(() =>
      apply.Execute(
        {
          ActorUserId: randomUUID(),
          UserId: userId,
          CanonicalRoleCodeRaw: ROLE,
          Operation: 'assign',
          RunId: runId,
          IntentVersion: reg.Data.IntentVersion,
        },
        ctx(actor),
      ),
    );
    expect(mismatch.status).toBe(403);
    expect(mismatch.code).toBe(ErrorCode.IntentActorMismatch);
  });

  it('unknown user or role is 404 before any state change', async () => {
    if (!available) return;
    const actor = randomUUID();
    const unknownUser = await errorCodeOf(() =>
      register.Execute({
        ActorUserId: actor,
        UserId: randomUUID(),
        CanonicalRoleCodeRaw: ROLE,
        Operation: 'assign',
        RunId: randomUUID(),
      }),
    );
    expect(unknownUser.status).toBe(404);
    const userId = await freshUser();
    const unknownRole = await errorCodeOf(() =>
      register.Execute({
        ActorUserId: actor,
        UserId: userId,
        CanonicalRoleCodeRaw: 'GHOST_ROLE',
        Operation: 'assign',
        RunId: randomUUID(),
      }),
    );
    expect(unknownRole.status).toBe(404);
    const badVersion = await errorCodeOf(() =>
      apply.Execute(
        {
          ActorUserId: actor,
          UserId: userId,
          CanonicalRoleCodeRaw: ROLE,
          Operation: 'assign',
          RunId: randomUUID(),
          IntentVersion: 'not-a-number',
        },
        ctx(actor),
      ),
    );
    expect(badVersion.status).toBe(400);
  });
});
