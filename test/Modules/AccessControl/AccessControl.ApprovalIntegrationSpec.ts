import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
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
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';

/**
 * C6 AC3/AC5 — live Postgres integration. Exercises the REAL approval use cases against
 * real repositories + the real AuditedTransaction + the real PermissionChecker over the
 * seeded RBAC matrix, proving:
 *  1. AC5: approve writes exactly one Approve audit row with BeforeJson(PENDING) +
 *     AfterJson(APPROVED) in the same transaction as the request update.
 *  2. AC3: self-approval is blocked (ForbiddenAppException SELF_APPROVAL) and writes no
 *     audit row / leaves the request PENDING.
 *  3. AC2: CreateApprovalRequestUseCase produces a PENDING request (valid approver exists in
 *     the seeded matrix).
 * Skips gracefully with no DB so `yarn test` stays green in DB-less environments.
 */
describe('C6 approval workflow (live Postgres)', () => {
  let available = false;
  const writer = new AuditWriter();

  let auditedTransaction: AuditedTransaction;
  let approvalRepository: ApprovalRequestRepository;
  let permissionChecker: PermissionChecker;
  let approverDirectory: ApproverDirectory;
  let reasonCatalog: ReasonCodeCatalog;

  const requesterId = randomUUID();
  const approverId = randomUUID();
  const reasonCode = `C6-RSN-${randomUUID().slice(0, 8)}`;

  const auditRepo = () => dataSource.getRepository(AuditLogOrmEntity);

  const context = (actor: string): AuditContext => ({
    ActorUserId: actor,
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    CorrelationId: randomUUID(),
    RequestId: randomUUID(),
    IpAddress: '127.0.0.1',
    UserAgent: 'jest-c6-integration',
  });

  const seedPending = async (requester: string): Promise<ApprovalRequestEntity> => {
    const now = new Date();
    return approvalRepository.Create(
      new ApprovalRequestEntity({
        Id: randomUUID(),
        RequesterUserId: requester,
        Action: ActionCode.Adjust,
        TargetObjectType: ObjectType.InventoryStatus,
        TargetObjectId: `inv-${randomUUID().slice(0, 8)}`,
        TargetObjectCode: 'INV-C6',
        Scope: null,
        Decision: ApprovalDecision.Pending,
        ReferenceType: 'InventoryStatus',
        ReferenceId: `inv-${randomUUID().slice(0, 8)}`,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
  };

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch {
      available = false;

      console.warn('[ApprovalIntegrationSpec] No Postgres reachable — skipping live C6 assertions.');
    }
    if (!available) return;

    auditedTransaction = new AuditedTransaction(dataSource, writer);
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
    );
    approverDirectory = new ApproverDirectory(permissionRepository, rolePermissionRepository);
    reasonCatalog = new ReasonCodeCatalog(reasonRepository);

    // Seed the RBAC matrix (idempotent) so a role grants (Approve, ApprovalRequest).
    await SeedAccessControlRbac(roleRepository, permissionRepository, rolePermissionRepository);

    // Real users so user_roles FK is satisfied.
    const userRepo = dataSource.getRepository(UserOrmEntity);
    for (const [id, label] of [
      [requesterId, 'requester'],
      [approverId, 'approver'],
    ] as const) {
      await userRepo.save(
        userRepo.create({
          Id: id,
          FirstName: 'C6',
          LastName: label,
          EmailAddress: `c6-${label}-${id}@test.local`,
          PasswordHash: null,
          Role: 'Admin',
        }),
      );
    }

    // Both users get WMS_ADMIN (has Approve:ApprovalRequest, IncludeAll-less scope none -> request scope null
    // means no axis is enforced). Self-approval is then blocked purely by segregation, not by permission.
    const adminRole = await roleRepository.FindByCode(RoleCode.WmsAdmin);
    for (const userId of [requesterId, approverId]) {
      await userRoleRepository.Create(
        new UserRoleEntity({ Id: randomUUID(), UserId: userId, RoleId: adminRole!.Id, AssignedAt: new Date() }),
      );
    }

    // Decision reason code applicable to (Approve, ApprovalRequest).
    await reasonRepository.Create(
      new ReasonCodeEntity({
        Id: randomUUID(),
        ReasonCode: reasonCode,
        ReasonGroup: ReasonGroup.RuleOverride,
        Description: 'C6 approve reason',
        AppliesToActions: [ActionCode.Approve],
        AppliesToObjects: [ObjectType.ApprovalRequest],
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('AC2: CreateApprovalRequestUseCase persists a PENDING request when a valid approver exists', async () => {
    if (!available) return;
    const useCase = new CreateApprovalRequestUseCase(
      approvalRepository,
      approverDirectory,
      reasonCatalog,
      auditedTransaction,
    );

    const dto = await useCase.Execute(
      {
        Action: ActionCode.Adjust,
        TargetObjectType: ObjectType.InventoryStatus,
        TargetObjectId: `inv-${randomUUID().slice(0, 8)}`,
        TargetObjectCode: 'INV-CREATE',
      },
      context(requesterId),
    );

    expect(dto.Decision).toBe(ApprovalDecision.Pending);
    const row = await dataSource.getRepository(ApprovalRequestOrmEntity).findOne({ where: { Id: dto.Id } });
    expect(row).not.toBeNull();
    expect(row?.Decision).toBe(ApprovalDecision.Pending);
  });

  it('AC5: approve writes one Approve audit row with before(PENDING)/after(APPROVED) in one transaction', async () => {
    if (!available) return;
    const request = await seedPending(requesterId);

    const useCase = new ApproveApprovalRequestUseCase(
      approvalRepository,
      permissionChecker,
      reasonCatalog,
      auditedTransaction,
    );

    const dto = await useCase.Execute(
      { Id: request.Id, ReasonCode: reasonCode, ReasonNote: 'approved by C6' },
      context(approverId),
    );

    expect(dto.Decision).toBe(ApprovalDecision.Approved);
    expect(dto.DecidedByUserId).toBe(approverId);

    const persisted = await dataSource.getRepository(ApprovalRequestOrmEntity).findOne({ where: { Id: request.Id } });
    expect(persisted?.Decision).toBe(ApprovalDecision.Approved);

    const auditRows = await auditRepo().find({
      where: { ObjectType: ObjectType.ApprovalRequest, ObjectId: request.Id },
    });
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0];
    expect(row.Action).toBe(ActionCode.Approve);
    expect(row.ActorUserId).toBe(approverId);
    expect((row.BeforeJson as Record<string, unknown>)?.Decision).toBe(ApprovalDecision.Pending);
    expect((row.AfterJson as Record<string, unknown>)?.Decision).toBe(ApprovalDecision.Approved);
  });

  it('AC3: self-approval is blocked (SELF_APPROVAL) and writes no audit row / stays PENDING', async () => {
    if (!available) return;
    const request = await seedPending(approverId); // requester === decider

    const useCase = new ApproveApprovalRequestUseCase(
      approvalRepository,
      permissionChecker,
      reasonCatalog,
      auditedTransaction,
    );

    let caught: unknown;
    try {
      await useCase.Execute({ Id: request.Id }, context(approverId));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'SELF_APPROVAL' });

    const persisted = await dataSource.getRepository(ApprovalRequestOrmEntity).findOne({ where: { Id: request.Id } });
    expect(persisted?.Decision).toBe(ApprovalDecision.Pending);
    const auditCount = await auditRepo().count({
      where: { ObjectType: ObjectType.ApprovalRequest, ObjectId: request.Id },
    });
    expect(auditCount).toBe(0);
  });
});
