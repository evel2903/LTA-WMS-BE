import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { InMemoryRoleCatalogRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';
import { DataScopeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/DataScopeRepository';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';
import { ApprovalRequestRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ApprovalRequestRepository';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleDefinitionRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleDefinitionRepository';
import { OverrideLogRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/OverrideLogRepository';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { OverrideLogOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/OverrideLogOrmEntity';
import { RequestOverrideUseCase } from '@modules/WarehouseProfile/Application/UseCases/RequestOverrideUseCase';

/**
 * C7 AC1/AC3/AC5 — live Postgres integration. Exercises the REAL RequestOverrideUseCase against
 * real repositories + the real AuditedTransaction + the real PermissionChecker over the seeded RBAC
 * matrix, proving:
 *  1. AC5: a successful override writes exactly one override_logs row AND one Override audit row in
 *     the same transaction.
 *  2. AC3: a Compliance/HARD_BLOCK rule cannot be overridden (ForbiddenAppException
 *     OVERRIDE_NOT_ALLOWED) and writes no override_log / no audit row.
 *  3. AC1: override_logs is immutable — a raw UPDATE is rejected by the DB trigger.
 * Skips gracefully with no DB so `yarn test` stays green in DB-less environments.
 */
describe('C7 override control (live Postgres)', () => {
  let available = false;
  const writer = new AuditWriter();

  let auditedTransaction: AuditedTransaction;
  let overrideRepository: OverrideLogRepository;
  let ruleGroupRepository: RuleGroupRepository;
  let ruleDefinitionRepository: RuleDefinitionRepository;
  let approvalRepository: ApprovalRequestRepository;
  let permissionChecker: PermissionChecker;
  let reasonCatalog: ReasonCodeCatalog;

  const actorId = randomUUID();
  const reasonCode = `C7-RSN-${randomUUID().slice(0, 8)}`;

  const auditRepo = () => dataSource.getRepository(AuditLogOrmEntity);
  const overrideRepo = () => dataSource.getRepository(OverrideLogOrmEntity);

  const context = (actor: string): AuditContext => ({
    ActorUserId: actor,
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    CorrelationId: randomUUID(),
    RequestId: randomUUID(),
    IpAddress: '127.0.0.1',
    UserAgent: 'jest-c7-integration',
  });

  const seedRule = async (overrides: {
    ControlMode: RuleControlMode;
    PrecedenceTier?: RulePrecedenceTier;
    AllowOverride?: boolean;
  }): Promise<RuleDefinitionEntity> => {
    const now = new Date();
    const group = await ruleGroupRepository.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: `C7-GRP-${randomUUID().slice(0, 8)}`,
        GroupName: 'C7 group',
        CatalogState: RuleGroupCatalogState.Active,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    return ruleDefinitionRepository.Create(
      new RuleDefinitionEntity({
        Id: randomUUID(),
        RuleCode: `C7-RULE-${randomUUID().slice(0, 8)}`,
        RuleName: 'C7 rule',
        RuleGroupId: group.Id,
        PrecedenceTier: overrides.PrecedenceTier ?? RulePrecedenceTier.Operation,
        ControlMode: overrides.ControlMode,
        ScopeKey: `c7-scope-${randomUUID().slice(0, 8)}`,
        Status: RuleStatus.Active,
        EffectiveFrom: now,
        RequiresReason: false,
        RequiresEvidence: false,
        AllowOverride: overrides.AllowOverride ?? false,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
  };

  const makeUseCase = () =>
    new RequestOverrideUseCase(
      ruleDefinitionRepository,
      overrideRepository,
      permissionChecker,
      reasonCatalog,
      approvalRepository,
      auditedTransaction,
    );

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch {
      available = false;

      console.warn('[OverrideIntegrationSpec] No Postgres reachable — skipping live C7 assertions.');
    }
    if (!available) return;

    auditedTransaction = new AuditedTransaction(dataSource, writer);
    overrideRepository = new OverrideLogRepository(dataSource.getRepository(OverrideLogOrmEntity));
    ruleGroupRepository = new RuleGroupRepository(dataSource.getRepository(RuleGroupOrmEntity));
    ruleDefinitionRepository = new RuleDefinitionRepository(dataSource.getRepository(RuleDefinitionOrmEntity));
    approvalRepository = new ApprovalRequestRepository(dataSource.getRepository(ApprovalRequestOrmEntity));

    const roleRepository = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    const permissionRepository = new PermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    const rolePermissionRepository = new RolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity));
    const userRoleRepository = new UserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
    const dataScopeRepository = new DataScopeRepository(dataSource.getRepository(DataScopeOrmEntity));
    const reasonRepository = new ReasonCodeRepository(dataSource.getRepository(ReasonCodeOrmEntity));

    permissionChecker = new PermissionChecker(
      userRoleRepository,
      rolePermissionRepository,
      permissionRepository,
      dataScopeRepository,
      roleRepository,
    );
    reasonCatalog = new ReasonCodeCatalog(reasonRepository);

    // Seed the RBAC matrix (idempotent) so WMS_ADMIN grants (Override, OverrideLog).
    await SeedAccessControlRbac(
      roleRepository,
      permissionRepository,
      rolePermissionRepository,
      new InMemoryRoleCatalogRepository(roleRepository),
    );

    // Real user so user_roles FK is satisfied.
    const userRepo = dataSource.getRepository(UserOrmEntity);
    await userRepo.save(
      userRepo.create({
        Id: actorId,
        FirstName: 'C7',
        LastName: 'actor',
        EmailAddress: `c7-actor-${actorId}@test.local`,
        PasswordHash: null,
        Role: 'Admin',
      }),
    );
    const adminRole = await roleRepository.FindByCode(RoleCode.WmsAdmin);
    await userRoleRepository.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: actorId, RoleId: adminRole!.Id, AssignedAt: new Date() }),
    );

    // Override reason applicable to (Override, Rule) — the pair the use case validates against.
    await reasonRepository.Create(
      new ReasonCodeEntity({
        Id: randomUUID(),
        ReasonCode: reasonCode,
        ReasonGroup: ReasonGroup.RuleOverride,
        Description: 'C7 override reason',
        AppliesToActions: [ActionCode.Override],
        AppliesToObjects: [ObjectType.Rule],
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('AC5: a successful override writes one override_logs row + one Override audit row in one tx', async () => {
    if (!available) return;
    const rule = await seedRule({ ControlMode: RuleControlMode.SoftWarning, AllowOverride: true });

    const dto = await makeUseCase().Execute(
      {
        RuleId: rule.Id,
        TargetObjectType: ObjectType.Location,
        TargetObjectId: `loc-${randomUUID().slice(0, 8)}`,
        TargetObjectCode: 'LOC-C7',
        ReasonCode: reasonCode,
        ReasonNote: 'overridden by C7',
      },
      context(actorId),
    );

    const persisted = await overrideRepo().findOne({ where: { Id: dto.Id } });
    expect(persisted).not.toBeNull();
    expect(persisted?.RuleId).toBe(rule.Id);
    expect(persisted?.ActorUserId).toBe(actorId);

    const auditRows = await auditRepo().find({ where: { ObjectType: ObjectType.OverrideLog, ObjectId: dto.Id } });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].Action).toBe(ActionCode.Override);
    expect(auditRows[0].ReferenceType).toBe('OverrideLog');
    expect(auditRows[0].ReferenceId).toBe(dto.Id);
  });

  it('AC3: a Compliance/HARD_BLOCK rule cannot be overridden and writes no override_log / no audit', async () => {
    if (!available) return;
    const rule = await seedRule({
      ControlMode: RuleControlMode.HardBlock,
      PrecedenceTier: RulePrecedenceTier.Compliance,
      AllowOverride: true,
    });

    let caught: unknown;
    try {
      await makeUseCase().Execute(
        {
          RuleId: rule.Id,
          TargetObjectType: ObjectType.Location,
          TargetObjectId: `loc-${randomUUID().slice(0, 8)}`,
        },
        context(actorId),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'OVERRIDE_NOT_ALLOWED' });

    const logCount = await overrideRepo().count({ where: { RuleId: rule.Id } });
    expect(logCount).toBe(0);
    const auditCount = await auditRepo().count({
      where: { ObjectType: ObjectType.OverrideLog, ObjectCode: rule.RuleCode },
    });
    expect(auditCount).toBe(0);
  });

  it('AC1: override_logs is immutable — a raw UPDATE is rejected by the DB trigger', async () => {
    if (!available) return;
    const rule = await seedRule({ ControlMode: RuleControlMode.SoftWarning, AllowOverride: true });
    const dto = await makeUseCase().Execute(
      {
        RuleId: rule.Id,
        TargetObjectType: ObjectType.Location,
        TargetObjectId: `loc-${randomUUID().slice(0, 8)}`,
        ReasonCode: reasonCode,
      },
      context(actorId),
    );

    await expect(
      dataSource.query(`UPDATE override_logs SET reason_note = 'tampered' WHERE id = $1`, [dto.Id]),
    ).rejects.toThrow(/append-only/i);

    await expect(dataSource.query(`DELETE FROM override_logs WHERE id = $1`, [dto.Id])).rejects.toThrow(/append-only/i);
  });

  it('AC2: an APPROVED approval authorizes at most ONE override (single-use, DB-enforced)', async () => {
    if (!available) return;
    const rule = await seedRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true });
    const targetId = `loc-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const approval = await approvalRepository.Create(
      new ApprovalRequestEntity({
        Id: randomUUID(),
        RequesterUserId: randomUUID(),
        Action: ActionCode.Override,
        TargetObjectType: ObjectType.Location,
        TargetObjectId: targetId,
        Decision: ApprovalDecision.Approved,
        DecidedByUserId: actorId,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const req = {
      RuleId: rule.Id,
      TargetObjectType: ObjectType.Location,
      TargetObjectId: targetId,
      ReasonCode: reasonCode,
      ApprovalRequestId: approval.Id,
    };

    // First override consumes the approval.
    const first = await makeUseCase().Execute({ ...req }, context(actorId));
    expect(first.Id).toBeDefined();

    // Re-using the same APPROVED approval for a second override is rejected by the unique index.
    await expect(makeUseCase().Execute({ ...req }, context(actorId))).rejects.toBeInstanceOf(BusinessRuleException);
    const logCount = await overrideRepo().count({ where: { ApprovalRequestId: approval.Id } });
    expect(logCount).toBe(1);
  });
});
