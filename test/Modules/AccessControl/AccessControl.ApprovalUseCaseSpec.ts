import { randomUUID } from 'crypto';
import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { RejectApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/RejectApprovalRequestUseCase';
import { GetApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/GetApprovalRequestUseCase';
import { ListApprovalRequestsUseCase } from '@modules/AccessControl/Application/UseCases/ListApprovalRequestsUseCase';
import {
  InMemoryApprovalRequestRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleCatalogRepository,
  InMemoryRoleRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const REQUESTER = 'requester-1';
const APPROVER = 'approver-1';

const ctx = (actor: string): AuditContext => ({
  ActorUserId: actor,
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-c6',
  RequestId: 'req-c6',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
});

/** PermissionChecker stub honoring C2 segregation: SELF_APPROVAL when Scope.RequesterUserId === UserId. */
class FakePermissionChecker implements IPermissionChecker {
  constructor(private readonly allowed = true) {}
  public async Check(context: PermissionCheckContext): Promise<PermissionDecision> {
    if (
      context.Scope?.RequesterUserId &&
      context.Scope.RequesterUserId === context.UserId &&
      (context.Action === ActionCode.Approve || context.Action === ActionCode.Override)
    ) {
      return { Allowed: false, Reason: 'SELF_APPROVAL' };
    }
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
  public async ValidateReason(): Promise<ValidateReasonResult> {
    return this.result;
  }
}

const approverDirectoryWithSeed = async (): Promise<ApproverDirectory> => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions, new InMemoryRoleCatalogRepository(roles));
  return new ApproverDirectory(permissions, rolePermissions);
};

const emptyApproverDirectory = (): ApproverDirectory =>
  new ApproverDirectory(new InMemoryPermissionRepository(), new InMemoryRolePermissionRepository());

const seedPending = async (repo: InMemoryApprovalRequestRepository, overrides: Partial<ApprovalRequestEntity> = {}) => {
  const now = new Date();
  const entity = new ApprovalRequestEntity({
    Id: randomUUID(),
    RequesterUserId: REQUESTER,
    Action: ActionCode.Adjust,
    TargetObjectType: ObjectType.InventoryStatus,
    TargetObjectId: 'inv-1',
    TargetObjectCode: 'INV-1',
    Scope: { WarehouseId: 'W1' },
    Decision: ApprovalDecision.Pending,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
  await repo.Seed(entity);
  return entity;
};

describe('Approval workflow use cases (C6)', () => {
  // ---- AC2 ----
  it('AC2: creates a PENDING request and writes a Create audit entry when a valid approver exists', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const stub = new StubAuditedTransaction();
    const useCase = new CreateApprovalRequestUseCase(
      repo,
      await approverDirectoryWithSeed(),
      new FakeReasonCatalog(),
      stub as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute(
      {
        Action: ActionCode.Adjust,
        TargetObjectType: ObjectType.InventoryStatus,
        TargetObjectId: 'inv-1',
        TargetObjectCode: 'INV-1',
        ReferenceType: 'InventoryStatus',
        ReferenceId: 'inv-1',
      },
      ctx(REQUESTER),
    );

    expect(dto.Decision).toBe(ApprovalDecision.Pending);
    expect(dto.RequesterUserId).toBe(REQUESTER);
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.ApprovalRequest,
        ObjectId: dto.Id,
        ActorUserId: REQUESTER,
        ReferenceType: 'InventoryStatus',
        ReferenceId: 'inv-1',
      }),
    );
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ Decision: ApprovalDecision.Pending }));
  });

  it('AC2: blocks (BusinessRuleException) and writes no audit when no valid approver exists', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const stub = new StubAuditedTransaction();
    const useCase = new CreateApprovalRequestUseCase(
      repo,
      emptyApproverDirectory(),
      new FakeReasonCatalog(),
      stub as unknown as AuditedTransaction,
    );

    await expect(
      useCase.Execute(
        { Action: ActionCode.Adjust, TargetObjectType: ObjectType.InventoryStatus, TargetObjectId: 'inv-1' },
        ctx(REQUESTER),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(stub.Entries).toHaveLength(0);
    expect((await repo.List(0, 10)).TotalItems).toBe(0);
  });

  // ---- AC3 ----
  it('AC3: blocks self-approval via PermissionChecker segregation (ForbiddenAppException SELF_APPROVAL)', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo, { RequesterUserId: APPROVER });
    const stub = new StubAuditedTransaction();
    const useCase = new ApproveApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      stub as unknown as AuditedTransaction,
    );

    let caught: unknown;
    try {
      // actor === requester -> self approval
      await useCase.Execute({ Id: request.Id }, ctx(APPROVER));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'SELF_APPROVAL' });
    expect(stub.Entries).toHaveLength(0);
    // request stays pending (not mutated)
    expect((await repo.FindById(request.Id))?.Decision).toBe(ApprovalDecision.Pending);
  });

  it('AC3: defensive domain guard blocks self-approval even if the permission layer allows it', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo, { RequesterUserId: APPROVER });
    // checker that always allows (does not implement segregation)
    const alwaysAllow: IPermissionChecker = { Check: async () => ({ Allowed: true }) };
    const useCase = new ApproveApprovalRequestUseCase(repo, alwaysAllow, new FakeReasonCatalog());

    let caught: unknown;
    try {
      await useCase.Execute({ Id: request.Id }, ctx(APPROVER));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'SELF_APPROVAL' });
  });

  // ---- AC4 ----
  it('AC4: approves and writes an Approve audit entry with before(PENDING)/after(APPROVED) + decision reason', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    const stub = new StubAuditedTransaction();
    const useCase = new ApproveApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog({ ReasonCodeId: 'rc-approve', EvidenceRequired: false, ApprovalRequired: false }),
      stub as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute({ Id: request.Id, ReasonCode: 'RC-APPROVE', ReasonNote: 'ok' }, ctx(APPROVER));

    expect(dto.Decision).toBe(ApprovalDecision.Approved);
    expect(dto.DecidedByUserId).toBe(APPROVER);
    expect(dto.DecisionReasonCodeId).toBe('rc-approve');
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Approve,
        ObjectType: ObjectType.ApprovalRequest,
        ReasonCodeId: 'rc-approve',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual(expect.objectContaining({ Decision: ApprovalDecision.Pending }));
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ Decision: ApprovalDecision.Approved }));
  });

  it('AC4: rejects and writes an Approve audit entry with after image REJECTED (no Reject action token)', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    const stub = new StubAuditedTransaction();
    const useCase = new RejectApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      stub as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute({ Id: request.Id }, ctx(APPROVER));

    expect(dto.Decision).toBe(ApprovalDecision.Rejected);
    expect(stub.Entries[0].Action).toBe(ActionCode.Approve);
    expect(stub.Entries[0].BeforeJson).toEqual(expect.objectContaining({ Decision: ApprovalDecision.Pending }));
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ Decision: ApprovalDecision.Rejected }));
  });

  it('AC4: permission-denied / out-of-scope is blocked with ForbiddenAppException(reason)', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    const useCase = new ApproveApprovalRequestUseCase(repo, new FakePermissionChecker(false), new FakeReasonCatalog());

    let caught: unknown;
    try {
      await useCase.Execute({ Id: request.Id }, ctx(APPROVER));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'OUT_OF_SCOPE' });
  });

  it('AC4: blocks when the decision reason requires evidence but none is supplied', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    const useCase = new ApproveApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog({ ReasonCodeId: 'rc-ev', EvidenceRequired: true, ApprovalRequired: false }),
    );

    await expect(useCase.Execute({ Id: request.Id, ReasonCode: 'RC-EVIDENCE' }, ctx(APPROVER))).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('AC4: allows when evidence is required AND supplied', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    const useCase = new ApproveApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog({ ReasonCodeId: 'rc-ev', EvidenceRequired: true, ApprovalRequired: false }),
    );

    const dto = await useCase.Execute(
      { Id: request.Id, ReasonCode: 'RC-EVIDENCE', EvidenceRefs: [{ url: 'photo://1' }] },
      ctx(APPROVER),
    );
    expect(dto.Decision).toBe(ApprovalDecision.Approved);
  });

  it('AC4: an already-decided request cannot be decided again (BusinessRuleException)', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo, { Decision: ApprovalDecision.Approved, DecidedByUserId: 'someone' });
    const useCase = new RejectApprovalRequestUseCase(repo, new FakePermissionChecker(true), new FakeReasonCatalog());

    await expect(useCase.Execute({ Id: request.Id }, ctx(APPROVER))).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('AC4: concurrent decide is blocked by the in-transaction locked re-check (TOCTOU race)', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const request = await seedPending(repo);
    // Simulate a decision that commits between the pre-check and the locked read: FindById still
    // sees PENDING, but the locked in-transaction read (FindByIdForUpdate) sees it APPROVED. The
    // authoritative in-tx guard must reject and write NO audit entry.
    repo.FindByIdForUpdate = async () =>
      new ApprovalRequestEntity({ ...request, Decision: ApprovalDecision.Approved, DecidedByUserId: 'racer' });
    const stub = new StubAuditedTransaction();
    const useCase = new ApproveApprovalRequestUseCase(
      repo,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      stub as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute({ Id: request.Id }, ctx(APPROVER))).rejects.toBeInstanceOf(BusinessRuleException);
    expect(stub.Entries).toHaveLength(0);
  });

  // ---- Get/List ----
  it('Get returns the request DTO; List filters by Decision', async () => {
    const repo = new InMemoryApprovalRequestRepository();
    const pending = await seedPending(repo);
    await seedPending(repo, { Decision: ApprovalDecision.Approved });

    const got = await new GetApprovalRequestUseCase(repo).Execute(pending.Id);
    expect(got.Id).toBe(pending.Id);

    const list = await new ListApprovalRequestsUseCase(repo).Execute({ Decision: ApprovalDecision.Pending });
    expect(list.Items).toHaveLength(1);
    expect(list.Items[0].Decision).toBe(ApprovalDecision.Pending);
    expect(list.Meta.TotalItems).toBe(1);
  });
});
