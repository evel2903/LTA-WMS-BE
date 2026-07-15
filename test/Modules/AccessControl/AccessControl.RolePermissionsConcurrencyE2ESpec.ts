import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'crypto';
import AppDataSource from '@shared/Database/TypeOrmDataSource';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { PERMISSION_CATALOG } from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { SetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/SetRolePermissionsUseCase';
import { ResetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ResetRolePermissionsUseCase';

jest.setTimeout(60_000);

// Gated like V1Hb01RuntimeHttpDatabaseE2ESpec/V1Hb03PilotRuntimeHardeningSmokeSpec: needs a
// real reachable Postgres (row-level locking can't be proven against an InMemory double), so
// it is opt-in and skipped by default `yarn test` runs.
const RUN = process.env.RA02_CONCURRENCY_E2E === '1';
const describeConcurrency = RUN ? describe : describe.skip;

class FakeReasonCatalog implements IReasonCodeCatalog {
  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    return { ReasonCodeId: `fake-reason-${input.ReasonCode}`, EvidenceRequired: false, ApprovalRequired: false };
  }
}

const ctx: AuditContext = {
  ActorUserId: 'ra02-concurrency-test',
  ActorRoleCodes: [RoleCode.WmsAdmin],
  ActorType: ActorType.User,
  CorrelationId: 'ra02-concurrency',
  RequestId: 'ra02-concurrency',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest-concurrency-spec',
};

/**
 * Review Findings #3 regression: before the fix, PUT/reset read `current`, computed the
 * diff, and applied it OUTSIDE any lock -- two overlapping requests on the same role could
 * each compute added/removed from the same stale snapshot and silently clobber each other's
 * grants (the second write would not "see" the first). The fix re-locks the role
 * (pessimistic_write) and re-reads current INSIDE the transaction, so overlapping requests
 * serialize instead of interleaving. Proof: after two concurrent writes settle, the actual
 * persisted role_permissions must equal exactly the AfterJson of whichever audit entry
 * committed LAST -- no lost update, regardless of which request happened to win the race.
 */
describeConcurrency('RA-02 role-permissions concurrency (real Postgres, gated)', () => {
  let roleRepository: RoleRepository;
  let rolePermissionRepository: RolePermissionRepository;
  let permissionRepository: PermissionRepository;
  let setUseCase: SetRolePermissionsUseCase;
  let resetUseCase: ResetRolePermissionsUseCase;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    roleRepository = new RoleRepository(AppDataSource.getRepository(RoleOrmEntity));
    rolePermissionRepository = new RolePermissionRepository(AppDataSource.getRepository(RolePermissionOrmEntity));
    permissionRepository = new PermissionRepository(AppDataSource.getRepository(PermissionOrmEntity));
    const auditedTransaction = new AuditedTransaction(AppDataSource, new AuditWriter());
    const reasonCatalog = new FakeReasonCatalog();
    setUseCase = new SetRolePermissionsUseCase(
      roleRepository,
      rolePermissionRepository,
      permissionRepository,
      reasonCatalog,
      auditedTransaction,
    );
    resetUseCase = new ResetRolePermissionsUseCase(
      roleRepository,
      rolePermissionRepository,
      permissionRepository,
      reasonCatalog,
      auditedTransaction,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  /** Actual persisted permission_code set for a role, read fresh (bypasses any use-case response). */
  const readPersistedCodes = async (roleId: string): Promise<string[]> => {
    const current = await rolePermissionRepository.FindByRoleId(roleId);
    const resolved = await permissionRepository.FindByIds(current.map((rp) => rp.PermissionId));
    return resolved.map((p) => p.PermissionCode).sort();
  };

  /** The AfterJson.Permissions of whichever audit entry for this role committed last. */
  const readLastAuditAfterCodes = async (roleId: string): Promise<string[]> => {
    const rows = await AppDataSource.getRepository(AuditLogOrmEntity).find({
      where: { ObjectId: roleId },
      order: { OccurredAt: 'ASC' },
    });
    const last = rows[rows.length - 1];
    return ((last.AfterJson as { Permissions: string[] }).Permissions ?? []).slice().sort();
  };

  it('PUT concurrent with a different PUT on the same (custom) role: no lost update', async () => {
    const role = await roleRepository.Create(
      new RoleEntity({
        Id: randomUUID(),
        RoleCode: `RA02_CONC_${randomUUID().slice(0, 8)}`,
        RoleName: 'RA-02 concurrency test role',
        IsSystem: false,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );

    try {
      // Sequential baseline: role starts with exactly {Read:Role}.
      await setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
          ReasonCode: 'RC-BASELINE',
        },
        ctx,
      );

      // Concurrent A wants to revoke everything; concurrent B wants {Read:Role, Read:Permission}.
      // Pre-fix, both read the same stale `current` and could each apply a diff that ignores
      // the other's write, leaving neither request's response describing the real DB state.
      await Promise.all([
        setUseCase.Execute({ Id: role.Id, Permissions: [], ReasonCode: 'RC-A' }, ctx),
        setUseCase.Execute(
          {
            Id: role.Id,
            Permissions: [
              { Action: ActionCode.Read, ObjectType: ObjectType.Role },
              { Action: ActionCode.Read, ObjectType: ObjectType.Permission },
            ],
            ReasonCode: 'RC-B',
          },
          ctx,
        ),
      ]);

      const [persisted, lastAudit] = await Promise.all([readPersistedCodes(role.Id), readLastAuditAfterCodes(role.Id)]);
      expect(persisted).toEqual(lastAudit);
    } finally {
      await AppDataSource.getRepository(RolePermissionOrmEntity).delete({ RoleId: role.Id });
      await AppDataSource.getRepository(RoleOrmEntity).delete({ Id: role.Id });
      // audit_logs is append-only (DB trigger blocks UPDATE/DELETE) -- the entries this test
      // wrote are left in place by design, same as any other real mutation.
    }
  });

  it('PUT concurrent with reset on a system role (QC): no lost update', async () => {
    const qc = await roleRepository.FindByCode(RoleCode.Qc);
    if (!qc) throw new Error('QC seed role not found -- is SeedAccessControlRbac boot seeding applied to this DB?');

    const currentRows = await rolePermissionRepository.FindByRoleId(qc.Id);
    const currentPermissions = await permissionRepository.FindByIds(currentRows.map((rp) => rp.PermissionId));
    const currentCodes = new Set(currentPermissions.map((p) => p.PermissionCode));
    // Any catalog pair QC doesn't already hold, excluding the Signal 4 rider-blocked
    // write-actions on Role/Permission -- derived instead of guessed, since QC's actual seed
    // grant breadth (which turns out to be Read-heavy) isn't something this test should assume.
    const isRiderBlocked = (action: ActionCode, objectType: ObjectType) =>
      (objectType === ObjectType.Role || objectType === ObjectType.Permission) &&
      (action === ActionCode.Create || action === ActionCode.Update || action === ActionCode.DeleteCancel);
    const extraCatalogEntry = PERMISSION_CATALOG.find(
      (entry) =>
        !isRiderBlocked(entry.Action, entry.ObjectType) &&
        !currentCodes.has(PermissionEntity.BuildCode(entry.Action, entry.ObjectType)),
    );
    if (!extraCatalogEntry)
      throw new Error('No add-only-safe extra permission candidate found for the QC concurrency test');
    const extraPair: [ActionCode, ObjectType] = [extraCatalogEntry.Action, extraCatalogEntry.ObjectType];

    try {
      // Concurrent PUT adds one extra grant (add-only-safe: current stays a subset of desired,
      // so `removed` is empty) while reset independently restores QC to raw seed.
      await Promise.all([
        setUseCase.Execute(
          {
            Id: qc.Id,
            Permissions: [
              ...currentPermissions.map((p) => ({ Action: p.Action, ObjectType: p.ObjectType })),
              { Action: extraPair[0], ObjectType: extraPair[1] },
            ],
            ReasonCode: 'RC-ADD',
          },
          ctx,
        ),
        resetUseCase.Execute({ Id: qc.Id, ReasonCode: 'RC-RESET' }, ctx),
      ]);

      const [persisted, lastAudit] = await Promise.all([readPersistedCodes(qc.Id), readLastAuditAfterCodes(qc.Id)]);
      expect(persisted).toEqual(lastAudit);
    } finally {
      // Always restore QC to its true seed baseline regardless of race outcome/order.
      await resetUseCase.Execute({ Id: qc.Id, ReasonCode: 'RC-CLEANUP' }, ctx);
    }
  });
});
