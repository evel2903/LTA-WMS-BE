import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryDataScopeRepository,
  FakeAuditWriter,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RequestOverrideUseCase } from '@modules/WarehouseProfile/Application/UseCases/RequestOverrideUseCase';
import {
  InMemoryOverrideLogRepository,
  InMemoryRuleDefinitionRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * AC3 — consolidated validation test matrix. Each RBAC-VAL rule (doc 09) is proven against
 * the EXISTING enforcement shipped in C2/C6/C7/C4/C5. C8 adds no new runtime command; this
 * spec is the materialized evidence that the catalog's "Implemented" claims hold.
 */

// ---- C2 PermissionChecker world (real service over in-memory RBAC seed) ----
const buildCheckerWorld = async () => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const userRoles = new InMemoryUserRoleRepository();
  const dataScopes = new InMemoryDataScopeRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions);
  const checker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes);

  const assign = async (userId: string, code: RoleCode) => {
    const role = await roles.FindByCode(code);
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: userId, RoleId: role!.Id, AssignedAt: new Date() }),
    );
  };
  const grantUserScope = async (userId: string, scopeType: DataScopeType, valueId: string) => {
    const now = new Date();
    await dataScopes.Create(
      new DataScopeEntity({
        Id: randomUUID(),
        PrincipalType: PrincipalType.User,
        PrincipalId: userId,
        ScopeType: scopeType,
        ScopeValueId: valueId,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
  };
  return { checker, assign, grantUserScope };
};

// ---- C7 override fakes ----
const ACTOR = 'actor-matrix';
const overrideCtx = (actor: string | null = ACTOR): AuditContext => ({
  ActorUserId: actor,
  ActorRoleCodes: ['WAREHOUSE_SUPERVISOR'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-matrix',
  RequestId: 'req-matrix',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
});

class FakePermissionChecker implements IPermissionChecker {
  constructor(private readonly allowed = true) {}
  public async Check(context: PermissionCheckContext): Promise<PermissionDecision> {
    void context;
    return this.allowed ? { Allowed: true } : { Allowed: false, Reason: 'OUT_OF_SCOPE' };
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  constructor(
    private readonly result: ValidateReasonResult = {
      ReasonCodeId: 'rc-id',
      EvidenceRequired: false,
      ApprovalRequired: false,
    },
  ) {}
  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    void input;
    return this.result;
  }
}

const approvalRepo = (): IApprovalRequestRepository =>
  ({ FindById: async () => null }) as unknown as IApprovalRequestRepository;

const buildOverrideUseCase = (
  rules: InMemoryRuleDefinitionRepository,
  overrides: InMemoryOverrideLogRepository,
  checkerAllowed = true,
) =>
  new RequestOverrideUseCase(
    rules,
    overrides,
    new FakePermissionChecker(checkerAllowed),
    new FakeReasonCatalog(),
    approvalRepo(),
    // C7 unit specs use a structurally-compatible stub; here a no-op tx is enough.
    {
      Run: async <T>(work: (m: never) => Promise<{ result: T; entry: AuditEntry }>) =>
        (await work(undefined as never)).result,
    } as unknown as AuditedTransaction,
  );

const baseRequest = (ruleId: string) => ({
  RuleId: ruleId,
  TargetObjectType: ObjectType.Location,
  TargetObjectId: 'loc-1',
  TargetObjectCode: 'LOC-1',
});

describe('Control validation matrix (AC3) — proves each RBAC-VAL via existing C2/C6/C7/C4 enforcement', () => {
  // RBAC-VAL-01 → CTRL-EX-01: action without permission is blocked (C2).
  it('RBAC-VAL-01: permission missing → PERMISSION_DENIED (C2 PermissionChecker)', async () => {
    const { checker } = await buildCheckerWorld();
    const decision = await checker.Check({
      UserId: 'ghost-no-roles',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    });
    expect(decision).toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
  });

  // RBAC-VAL-02 → CTRL-EX-02: data scope violation is blocked (C2).
  it('RBAC-VAL-02: data scope violation → OUT_OF_SCOPE (C2 PermissionChecker)', async () => {
    const world = await buildCheckerWorld();
    await world.assign('sup', RoleCode.WarehouseSupervisor); // has Read:Warehouse, no scope granted
    const decision = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'W1' },
    });
    expect(decision).toEqual({ Allowed: false, Reason: 'OUT_OF_SCOPE' });

    // Positive control: granting the matching scope lets it through.
    await world.grantUserScope('sup', DataScopeType.Warehouse, 'W1');
    const allowed = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'W1' },
    });
    expect(allowed.Allowed).toBe(true);
  });

  // RBAC-VAL-03 → CTRL-EX-03: segregation of duties — self-approval blocked (C2/C6).
  it('RBAC-VAL-03: self-approval → SELF_APPROVAL (C2 PermissionChecker, enforced by C6)', async () => {
    const world = await buildCheckerWorld();
    await world.assign('sup', RoleCode.WarehouseSupervisor); // has Approve:ApprovalRequest
    const selfApprove = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { RequesterUserId: 'sup' },
    });
    expect(selfApprove).toEqual({ Allowed: false, Reason: 'SELF_APPROVAL' });

    const otherApprove = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { RequesterUserId: 'someone-else' },
    });
    expect(otherApprove.Allowed).toBe(true);
  });

  // RBAC-VAL-07 → CTRL-EX-05: compliance hard-block is never override-able (C7).
  it('RBAC-VAL-07: no-override-compliance → OVERRIDE_NOT_ALLOWED (C7 RequestOverrideUseCase)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = BuildRule({
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      AllowOverride: true,
    });
    await rules.Create(rule);
    const useCase = buildOverrideUseCase(rules, overrides);

    await expect(useCase.Execute(baseRequest(rule.Id), overrideCtx())).rejects.toMatchObject({
      Details: { Reason: 'OVERRIDE_NOT_ALLOWED' },
    });
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  // RBAC-VAL-10: override requires reason; blocked when a reason-requiring rule has no reason (C7).
  it('RBAC-VAL-10: override missing reason → blocked, no override_log (C7)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = BuildRule({ RequiresReason: true, AllowOverride: true });
    await rules.Create(rule);
    const useCase = buildOverrideUseCase(rules, overrides);

    await expect(useCase.Execute(baseRequest(rule.Id), overrideCtx())).rejects.toBeInstanceOf(BusinessRuleException);
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  // RBAC-VAL-10 / RBAC-VAL-06: override needs approval; missing approval reference blocks (C6/C7).
  it('RBAC-VAL-06/10: override missing approval → blocked, no override_log (C6/C7)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true });
    await rules.Create(rule);
    const useCase = buildOverrideUseCase(rules, overrides);

    await expect(useCase.Execute(baseRequest(rule.Id), overrideCtx())).rejects.toBeInstanceOf(BusinessRuleException);
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  // RBAC-VAL-01 (sensitive write) also blocks at the override path when permission denied (C7→C2).
  it('RBAC-VAL-01: override with denied permission → ForbiddenAppException, no override_log (C7→C2)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = BuildRule({ AllowOverride: true });
    await rules.Create(rule);
    const useCase = buildOverrideUseCase(rules, overrides, false);

    await expect(useCase.Execute(baseRequest(rule.Id), overrideCtx())).rejects.toBeInstanceOf(ForbiddenAppException);
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  // RBAC-VAL-08 → audit-in-tx: a failing command rolls back the audit entry (C4/C5 AuditedTransaction).
  it('RBAC-VAL-08: audit is in-tx — a command failure rolls back the audit append (C5 AuditedTransaction)', async () => {
    const writer = new FakeAuditWriter();
    let committed = false;
    // Fake DataSource.transaction: commits only if the callback resolves, else propagates the error.
    const fakeDataSource = {
      transaction: async (cb: (manager: unknown) => Promise<unknown>) => {
        const result = await cb({});
        committed = true;
        return result;
      },
    };
    const audited = new AuditedTransaction(fakeDataSource as never, writer);

    const entry = (): AuditEntry => ({
      ActorUserId: ACTOR,
      ActorRoleCodes: ['WMS_ADMIN'],
      ActorType: ActorType.User,
      Action: ActionCode.Create,
      ObjectType: ObjectType.Warehouse,
      ObjectId: 'wh-1',
      ObjectCode: 'WH-1',
      BeforeJson: null,
      AfterJson: { Name: 'WH' },
      ReasonCodeId: null,
      ReasonNote: null,
      CorrelationId: 'corr-audit',
    });

    await expect(
      audited.Run<number>(async () => {
        throw new Error('command failed');
      }),
    ).rejects.toThrow('command failed');

    // Audit never appended and the tx never committed.
    expect(writer.Entries).toHaveLength(0);
    expect(committed).toBe(false);

    // Happy path: a successful command appends exactly one audit entry in the same tx.
    const ok = await audited.Run(async () => ({ result: 'done', entry: entry() }));
    expect(ok).toBe('done');
    expect(writer.Entries).toHaveLength(1);
    expect(committed).toBe(true);
  });

  // RBAC-VAL-09 → CTRL-EX-08: audit immutability is enforced by a DB trigger; assert the
  // trigger SQL ships in the C4 migration (the live UPDATE/DELETE rejection is covered by
  // AccessControl.AuditLogIntegrationSpec when a DB is reachable).
  it('RBAC-VAL-09: audit immutability trigger SQL exists in the C4 migration', () => {
    const migrationPath = join(
      __dirname,
      '../../../src/Shared/Database/Migrations/1781633000000-CreateAuditLogAndImmutability.ts',
    );
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/TRIGGER/i);
    expect(sql).toMatch(/audit_logs/i);
    expect(sql.toUpperCase()).toContain('UPDATE');
    expect(sql.toUpperCase()).toContain('DELETE');
  });
});
