import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { ControlExceptionCatalog } from '@modules/AccessControl/Application/Services/ControlExceptionCatalog';
import { SeedReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
import { SeedControlExceptionCatalog } from '@modules/AccessControl/Application/Services/ControlExceptionCatalogSeed';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';
import { ControlExceptionCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ControlExceptionCatalogRepository';
import { ExceptionCaseRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ExceptionCaseRepository';
import { ApprovalRequestRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ApprovalRequestRepository';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { CreateExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CreateExceptionUseCase';
import { LogExceptionUseCase } from '@modules/AccessControl/Application/UseCases/LogExceptionUseCase';
import { AssignExceptionUseCase } from '@modules/AccessControl/Application/UseCases/AssignExceptionUseCase';
import { SubmitExceptionForApprovalUseCase } from '@modules/AccessControl/Application/UseCases/SubmitExceptionForApprovalUseCase';
import { ResolveExceptionUseCase } from '@modules/AccessControl/Application/UseCases/ResolveExceptionUseCase';
import { CloseExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CloseExceptionUseCase';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';

/**
 * C9 AC5 — live Postgres integration. Exercises the REAL exception lifecycle use cases against
 * real repositories + the real AuditedTransaction + the seeded reason / control-exception
 * catalogs, proving:
 *  1. The full 6-state happy path DETECTED -> LOGGED -> ASSIGNED -> IN_REVIEW_PENDING_APPROVAL
 *     -> RESOLVED -> CLOSED persists, and every transition writes an audit row (Create for the
 *     create, Update for each of the 5 transitions) -> 6 rows total for the case.
 *  2. An invalid transition (CLOSED -> close again) is rejected with INVALID_EXCEPTION_TRANSITION.
 *  3. An EvidenceRequired exception type (CTRL-EX-04) with no evidence CANNOT close.
 * Skips gracefully with no DB so `yarn test` stays green in DB-less environments.
 */
describe('C9 exception lifecycle (live Postgres)', () => {
  let available = false;
  const writer = new AuditWriter();

  let auditedTransaction: AuditedTransaction;
  let exceptionRepo: ExceptionCaseRepository;
  let createUseCase: CreateExceptionUseCase;
  let logUseCase: LogExceptionUseCase;
  let assignUseCase: AssignExceptionUseCase;
  let submitUseCase: SubmitExceptionForApprovalUseCase;
  let resolveUseCase: ResolveExceptionUseCase;
  let closeUseCase: CloseExceptionUseCase;

  const actorId = randomUUID();

  const auditRepo = () => dataSource.getRepository(AuditLogOrmEntity);

  const context = (): AuditContext => ({
    ActorUserId: actorId,
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    CorrelationId: randomUUID(),
    RequestId: randomUUID(),
    IpAddress: '127.0.0.1',
    UserAgent: 'jest-c9-integration',
  });

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch {
      available = false;

      console.warn('[ExceptionLifecycleIntegrationSpec] No Postgres reachable — skipping live C9 assertions.');
    }
    if (!available) return;

    auditedTransaction = new AuditedTransaction(dataSource, writer);
    exceptionRepo = new ExceptionCaseRepository(dataSource.getRepository(ExceptionCaseOrmEntity));
    const approvalRepo = new ApprovalRequestRepository(dataSource.getRepository(ApprovalRequestOrmEntity));
    const reasonRepo = new ReasonCodeRepository(dataSource.getRepository(ReasonCodeOrmEntity));
    const controlRepo = new ControlExceptionCatalogRepository(
      dataSource.getRepository(ControlExceptionCatalogOrmEntity),
    );
    const roleRepo = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    const permRepo = new PermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    const rolePermRepo = new RolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity));

    // Seed the catalogs the use cases consume (idempotent): RBAC (so a valid approver exists),
    // reason codes (incl. RC-EXC-RESOLVE) and the control-exception catalog (CTRL-EX-*).
    await SeedAccessControlRbac(roleRepo, permRepo, rolePermRepo);
    await SeedReasonCodeCatalog(reasonRepo);
    await SeedControlExceptionCatalog(controlRepo);

    const reasonCatalog = new ReasonCodeCatalog(reasonRepo);
    const controlCatalog = new ControlExceptionCatalog(controlRepo);
    const createApproval = new CreateApprovalRequestUseCase(
      approvalRepo,
      new ApproverDirectory(permRepo, rolePermRepo),
      reasonCatalog,
      auditedTransaction,
    );

    createUseCase = new CreateExceptionUseCase(exceptionRepo, controlCatalog, auditedTransaction);
    logUseCase = new LogExceptionUseCase(exceptionRepo, auditedTransaction);
    assignUseCase = new AssignExceptionUseCase(exceptionRepo, auditedTransaction);
    submitUseCase = new SubmitExceptionForApprovalUseCase(
      exceptionRepo,
      controlCatalog,
      createApproval,
      auditedTransaction,
    );
    resolveUseCase = new ResolveExceptionUseCase(
      exceptionRepo,
      controlCatalog,
      reasonCatalog,
      approvalRepo,
      auditedTransaction,
    );
    closeUseCase = new CloseExceptionUseCase(exceptionRepo, controlCatalog, approvalRepo, auditedTransaction);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('AC5: drives the full 6-state lifecycle and writes an audit row per transition', async () => {
    if (!available) return;

    // CTRL-EX-01 (Implemented; no reason/evidence/approval required) for a clean happy path.
    const created = await createUseCase.Execute(
      { ExceptionType: 'CTRL-EX-01', ReferenceType: 'InventoryStatus', ReferenceId: `inv-${randomUUID().slice(0, 8)}` },
      context(),
    );
    expect(created.State).toBe(ExceptionState.Detected);

    const logged = await logUseCase.Execute({ Id: created.Id }, context());
    expect(logged.State).toBe(ExceptionState.Logged);

    const assigned = await assignUseCase.Execute({ Id: created.Id, AssignedToUserId: actorId }, context());
    expect(assigned.State).toBe(ExceptionState.Assigned);

    const submitted = await submitUseCase.Execute({ Id: created.Id }, context());
    expect(submitted.State).toBe(ExceptionState.InReviewPendingApproval);

    const resolved = await resolveUseCase.Execute({ Id: created.Id, ResolutionNote: 'fixed' }, context());
    expect(resolved.State).toBe(ExceptionState.Resolved);

    const closed = await closeUseCase.Execute({ Id: created.Id }, context());
    expect(closed.State).toBe(ExceptionState.Closed);

    // Persisted final state.
    const persisted = await dataSource.getRepository(ExceptionCaseOrmEntity).findOne({ where: { Id: created.Id } });
    expect(persisted?.State).toBe(ExceptionState.Closed);

    // AC4/AC5: one Create + five Update audit rows for this case (audit every transition).
    const rows = await auditRepo().find({ where: { ObjectType: ObjectType.ExceptionCase, ObjectId: created.Id } });
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.Action === ActionCode.Create)).toHaveLength(1);
    expect(rows.filter((r) => r.Action === ActionCode.Update)).toHaveLength(5);
  });

  it('AC2/AC5: an invalid transition (close a CLOSED case) is rejected with INVALID_EXCEPTION_TRANSITION', async () => {
    if (!available) return;

    const created = await createUseCase.Execute(
      { ExceptionType: 'CTRL-EX-01', ReferenceType: 'InventoryStatus', ReferenceId: `inv-${randomUUID().slice(0, 8)}` },
      context(),
    );
    await logUseCase.Execute({ Id: created.Id }, context());
    await assignUseCase.Execute({ Id: created.Id, AssignedToUserId: actorId }, context());
    await submitUseCase.Execute({ Id: created.Id }, context());
    await resolveUseCase.Execute({ Id: created.Id, ResolutionNote: 'fixed' }, context());
    await closeUseCase.Execute({ Id: created.Id }, context());

    let caught: unknown;
    try {
      await closeUseCase.Execute({ Id: created.Id }, context());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).message).toContain('INVALID_EXCEPTION_TRANSITION');
  });

  it('AC5: an EvidenceRequired exception (CTRL-EX-04) with no evidence CANNOT close', async () => {
    if (!available) return;

    // CTRL-EX-04 = exception-closure control (DeferredToC9): ReasonRequired + EvidenceRequired.
    const created = await createUseCase.Execute(
      { ExceptionType: 'CTRL-EX-04', ReferenceType: 'InventoryStatus', ReferenceId: `inv-${randomUUID().slice(0, 8)}` },
      context(),
    );
    await logUseCase.Execute({ Id: created.Id }, context());
    await assignUseCase.Execute({ Id: created.Id, AssignedToUserId: actorId }, context());
    await submitUseCase.Execute({ Id: created.Id }, context());

    // Resolve requires reason + evidence -> supply both to reach RESOLVED.
    const resolved = await resolveUseCase.Execute(
      {
        Id: created.Id,
        ReasonCode: 'RC-EXC-RESOLVE',
        EvidenceRefs: [{ url: 'photo://evidence' }],
        ResolutionNote: 'fixed',
      },
      context(),
    );
    expect(resolved.State).toBe(ExceptionState.Resolved);

    // Now strip the evidence and try to close: the closure control must block it.
    const stored = await exceptionRepo.FindById(created.Id);
    stored!.EvidenceRefs = null;
    await exceptionRepo.Update(stored!);

    let caught: unknown;
    try {
      await closeUseCase.Execute({ Id: created.Id }, context());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BusinessRuleException);

    const persisted = await dataSource.getRepository(ExceptionCaseOrmEntity).findOne({ where: { Id: created.Id } });
    expect(persisted?.State).toBe(ExceptionState.Resolved);
  });
});
