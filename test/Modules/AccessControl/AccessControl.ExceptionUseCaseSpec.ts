import { randomUUID } from 'crypto';
import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { CreateExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CreateExceptionUseCase';
import { LogExceptionUseCase } from '@modules/AccessControl/Application/UseCases/LogExceptionUseCase';
import { AssignExceptionUseCase } from '@modules/AccessControl/Application/UseCases/AssignExceptionUseCase';
import { SubmitExceptionForApprovalUseCase } from '@modules/AccessControl/Application/UseCases/SubmitExceptionForApprovalUseCase';
import { ResolveExceptionUseCase } from '@modules/AccessControl/Application/UseCases/ResolveExceptionUseCase';
import { CloseExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CloseExceptionUseCase';
import { GetExceptionUseCase } from '@modules/AccessControl/Application/UseCases/GetExceptionUseCase';
import { ListExceptionsUseCase } from '@modules/AccessControl/Application/UseCases/ListExceptionsUseCase';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ExceptionSubStatus } from '@modules/AccessControl/Domain/Enums/ExceptionSubStatus';
import {
  InMemoryApprovalRequestRepository,
  InMemoryExceptionCaseRepository,
  StubAuditedTransaction,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';

const ACTOR = 'actor-1';

const ctx = (actor: string | null = ACTOR): AuditContext => ({
  ActorUserId: actor,
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-c9',
  RequestId: 'req-c9',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
});

const catalogEntry = (overrides: Partial<ControlExceptionCatalogEntity> = {}): ControlExceptionCatalogEntity => {
  const now = new Date();
  return new ControlExceptionCatalogEntity({
    Id: randomUUID(),
    Code: 'CTRL-EX-01',
    Scenario: 'test',
    Category: ControlExceptionCategory.AuthorizationDenied,
    Severity: ControlExceptionSeverity.High,
    DefaultState: ControlExceptionDefaultState.Blocked,
    ActionAllowed: ControlExceptionAction.Block,
    ReasonRequired: false,
    EvidenceRequired: false,
    ApprovalRequired: false,
    ImplementationStatus: CatalogImplementationStatus.Implemented,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
};

/** Catalog stub: returns a fixed entry; throws (like C8) for an unknown code. */
class FakeControlExceptionCatalog implements IControlExceptionCatalog {
  constructor(private readonly entry: ControlExceptionCatalogEntity = catalogEntry()) {}
  public async FindByCode(): Promise<ControlExceptionCatalogEntity | null> {
    return this.entry;
  }
  public async List(): Promise<ControlExceptionCatalogEntity[]> {
    return [this.entry];
  }
  public async ValidateExceptionType(code: string): Promise<ControlExceptionCatalogEntity> {
    if (code === 'UNKNOWN') throw new BusinessRuleException(`Unknown control exception code: ${code}`);
    return this.entry;
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public readonly Calls: ValidateReasonInput[] = [];
  constructor(
    private readonly result: ValidateReasonResult = {
      ReasonCodeId: 'rc-id',
      EvidenceRequired: false,
      ApprovalRequired: false,
    },
  ) {}
  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    this.Calls.push(input);
    return this.result;
  }
}

const seedCase = async (
  repo: InMemoryExceptionCaseRepository,
  state: ExceptionState,
  overrides: Partial<ExceptionCaseEntity> = {},
): Promise<ExceptionCaseEntity> => {
  const now = new Date();
  const entity = new ExceptionCaseEntity({
    Id: randomUUID(),
    ExceptionType: 'CTRL-EX-01',
    State: state,
    ReferenceType: 'InventoryStatus',
    ReferenceId: 'inv-1',
    Severity: ControlExceptionSeverity.High,
    OpenedAt: now,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
  await repo.Seed(entity);
  return entity;
};

describe('Exception lifecycle use cases (C9)', () => {
  // ---------- AC3: Create validates type + requires reference/severity ----------
  describe('CreateExceptionUseCase (AC3)', () => {
    it('creates a DETECTED case, validates the type via C8 and writes a Create audit row', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const stub = new StubAuditedTransaction();
      const useCase = new CreateExceptionUseCase(
        repo,
        new FakeControlExceptionCatalog(catalogEntry({ Severity: ControlExceptionSeverity.Medium })),
        stub as unknown as AuditedTransaction,
      );

      const dto = await useCase.Execute(
        { ExceptionType: 'CTRL-EX-01', ReferenceType: 'InventoryStatus', ReferenceId: 'inv-9' },
        ctx(),
      );

      expect(dto.State).toBe(ExceptionState.Detected);
      // Severity defaulted from the catalog entry when not supplied.
      expect(dto.Severity).toBe(ControlExceptionSeverity.Medium);
      expect(stub.Entries).toHaveLength(1);
      expect(stub.Entries[0]).toEqual(
        expect.objectContaining({
          Action: ActionCode.Create,
          ObjectType: ObjectType.ExceptionCase,
          ObjectId: dto.Id,
          ActorUserId: ACTOR,
          ReferenceType: 'InventoryStatus',
          ReferenceId: 'inv-9',
        }),
      );
    });

    it('lets the caller override the catalog severity', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const useCase = new CreateExceptionUseCase(repo, new FakeControlExceptionCatalog());
      const dto = await useCase.Execute(
        {
          ExceptionType: 'CTRL-EX-01',
          ReferenceType: 'InventoryStatus',
          ReferenceId: 'inv-9',
          Severity: ControlExceptionSeverity.Low,
        },
        ctx(),
      );
      expect(dto.Severity).toBe(ControlExceptionSeverity.Low);
    });

    it('blocks when the object reference is missing', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const useCase = new CreateExceptionUseCase(repo, new FakeControlExceptionCatalog());
      await expect(
        useCase.Execute({ ExceptionType: 'CTRL-EX-01', ReferenceType: '', ReferenceId: '' }, ctx()),
      ).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('propagates the catalog rejection for an unknown/deferred exception type', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const useCase = new CreateExceptionUseCase(repo, new FakeControlExceptionCatalog());
      await expect(
        useCase.Execute({ ExceptionType: 'UNKNOWN', ReferenceType: 'X', ReferenceId: 'y' }, ctx()),
      ).rejects.toBeInstanceOf(BusinessRuleException);
    });
  });

  // ---------- AC2: transitions go through the state machine; audit before/after ----------
  describe('Log / Assign transitions (AC2, AC4)', () => {
    it('Log: DETECTED -> LOGGED writes an Update audit row with before/after state', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Detected);
      const stub = new StubAuditedTransaction();
      const useCase = new LogExceptionUseCase(repo, stub as unknown as AuditedTransaction);

      const dto = await useCase.Execute({ Id: entity.Id }, ctx());

      expect(dto.State).toBe(ExceptionState.Logged);
      expect(stub.Entries).toHaveLength(1);
      expect(stub.Entries[0].Action).toBe(ActionCode.Update);
      expect((stub.Entries[0].BeforeJson as Record<string, unknown>)?.State).toBe(ExceptionState.Detected);
      expect((stub.Entries[0].AfterJson as Record<string, unknown>)?.State).toBe(ExceptionState.Logged);
    });

    it('Log: records SubStatus=AUTO_BLOCKED on a hard block', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Detected);
      const useCase = new LogExceptionUseCase(repo);
      const dto = await useCase.Execute({ Id: entity.Id, HardBlock: true }, ctx());
      expect(dto.SubStatus).toBe(ExceptionSubStatus.AutoBlocked);
    });

    it('Log: rejects an illegal edge (LOGGED -> LOGGED) with INVALID_EXCEPTION_TRANSITION and writes no audit', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Logged);
      const stub = new StubAuditedTransaction();
      const useCase = new LogExceptionUseCase(repo, stub as unknown as AuditedTransaction);

      let caught: unknown;
      try {
        await useCase.Execute({ Id: entity.Id }, ctx());
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BusinessRuleException);
      expect((caught as BusinessRuleException).message).toContain('INVALID_EXCEPTION_TRANSITION');
      expect(stub.Entries).toHaveLength(0);
    });

    it('throws NotFound for a missing case', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const useCase = new LogExceptionUseCase(repo);
      await expect(useCase.Execute({ Id: 'missing' }, ctx())).rejects.toBeInstanceOf(NotFoundException);
    });

    it('Assign: LOGGED -> ASSIGNED requires an assignee', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Logged);
      const useCase = new AssignExceptionUseCase(repo);
      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('Assign: sets the owner/assignee and transitions to ASSIGNED', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Logged);
      const useCase = new AssignExceptionUseCase(repo);
      const dto = await useCase.Execute({ Id: entity.Id, AssignedToUserId: 'u-1', OwnerId: 'o-1' }, ctx());
      expect(dto.State).toBe(ExceptionState.Assigned);
      expect(dto.AssignedToUserId).toBe('u-1');
      expect(dto.OwnerId).toBe('o-1');
    });
  });

  // ---------- AC2/AC4: Submit creates approval when needed ----------
  describe('SubmitExceptionForApprovalUseCase (AC4 approval policy)', () => {
    const buildSubmit = (
      repo: InMemoryExceptionCaseRepository,
      approvalRepo: InMemoryApprovalRequestRepository,
      entry = catalogEntry(),
      stub?: StubAuditedTransaction,
    ): SubmitExceptionForApprovalUseCase => {
      const createApproval = {
        Execute: async () => {
          const now = new Date();
          const ar = new ApprovalRequestEntity({
            Id: randomUUID(),
            RequesterUserId: ACTOR,
            Action: ActionCode.Approve,
            TargetObjectType: ObjectType.ExceptionCase,
            TargetObjectId: 'x',
            Decision: ApprovalDecision.Pending,
            CreatedAt: now,
            UpdatedAt: now,
          });
          await approvalRepo.Create(ar);
          return { Id: ar.Id, Decision: ApprovalDecision.Pending } as never;
        },
      } as unknown as CreateApprovalRequestUseCase;
      return new SubmitExceptionForApprovalUseCase(
        repo,
        new FakeControlExceptionCatalog(entry),
        createApproval,
        stub as unknown as AuditedTransaction,
      );
    };

    it('does NOT create an approval when neither caller nor catalog requires it (policy default)', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Assigned);
      const useCase = buildSubmit(repo, approvalRepo);

      const dto = await useCase.Execute({ Id: entity.Id }, ctx());
      expect(dto.State).toBe(ExceptionState.InReviewPendingApproval);
      expect(dto.ApprovalRequestId).toBeNull();
      expect((await approvalRepo.List(0, 10)).TotalItems).toBe(0);
    });

    it('creates and links an approval when the caller requests it', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Assigned);
      const useCase = buildSubmit(repo, approvalRepo);

      const dto = await useCase.Execute({ Id: entity.Id, RequireApproval: true }, ctx());
      expect(dto.ApprovalRequestId).not.toBeNull();
      expect((await approvalRepo.List(0, 10)).TotalItems).toBe(1);
    });

    it('creates an approval when the catalog entry has ApprovalRequired', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Assigned);
      const useCase = buildSubmit(repo, approvalRepo, catalogEntry({ ApprovalRequired: true }));

      const dto = await useCase.Execute({ Id: entity.Id }, ctx());
      expect(dto.ApprovalRequestId).not.toBeNull();
    });

    it('requires an actor', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Assigned);
      const useCase = buildSubmit(repo, approvalRepo);
      await expect(useCase.Execute({ Id: entity.Id }, ctx(null))).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });

  // ---------- AC4: Resolve guards (reason/evidence/approval) ----------
  describe('ResolveExceptionUseCase (AC4)', () => {
    const buildResolve = (
      repo: InMemoryExceptionCaseRepository,
      approvalRepo: InMemoryApprovalRequestRepository,
      reasonCatalog: FakeReasonCatalog,
      entry = catalogEntry(),
    ): ResolveExceptionUseCase =>
      new ResolveExceptionUseCase(repo, new FakeControlExceptionCatalog(entry), reasonCatalog, approvalRepo);

    it('resolves with no requirements (catalog all-false)', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval);
      const useCase = buildResolve(repo, approvalRepo, new FakeReasonCatalog());
      const dto = await useCase.Execute({ Id: entity.Id, ResolutionNote: 'done' }, ctx());
      expect(dto.State).toBe(ExceptionState.Resolved);
      expect(dto.ResolvedAt).not.toBeNull();
    });

    it('blocks when ReasonRequired but no reason supplied', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval);
      const useCase = buildResolve(repo, approvalRepo, new FakeReasonCatalog(), catalogEntry({ ReasonRequired: true }));
      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('validates the reason against (Update, ExceptionCase) — the seed-satisfiable pair', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval);
      const reasonCatalog = new FakeReasonCatalog({
        ReasonCodeId: 'rc-exc',
        EvidenceRequired: false,
        ApprovalRequired: false,
      });
      const useCase = buildResolve(repo, approvalRepo, reasonCatalog, catalogEntry({ ReasonRequired: true }));

      const dto = await useCase.Execute({ Id: entity.Id, ReasonCode: 'RC-EXC-RESOLVE' }, ctx());
      expect(dto.ReasonCodeId).toBe('rc-exc');
      expect(reasonCatalog.Calls[0]).toMatchObject({
        ReasonCode: 'RC-EXC-RESOLVE',
        Action: ActionCode.Update,
        ObjectType: ObjectType.ExceptionCase,
      });
    });

    it('blocks when EvidenceRequired but the case has no evidence', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval);
      const useCase = buildResolve(
        repo,
        approvalRepo,
        new FakeReasonCatalog(),
        catalogEntry({ ReasonRequired: true, EvidenceRequired: true }),
      );
      await expect(useCase.Execute({ Id: entity.Id, ReasonCode: 'RC-EXC-RESOLVE' }, ctx())).rejects.toBeInstanceOf(
        BusinessRuleException,
      );
    });

    it('resolves when EvidenceRequired AND evidence supplied at resolve', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval);
      const useCase = buildResolve(
        repo,
        approvalRepo,
        new FakeReasonCatalog(),
        catalogEntry({ ReasonRequired: true, EvidenceRequired: true }),
      );
      const dto = await useCase.Execute(
        { Id: entity.Id, ReasonCode: 'RC-EXC-RESOLVE', EvidenceRefs: [{ url: 'photo://1' }] },
        ctx(),
      );
      expect(dto.State).toBe(ExceptionState.Resolved);
    });

    it('blocks when a linked approval request is NOT APPROVED', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const now = new Date();
      const pending = new ApprovalRequestEntity({
        Id: randomUUID(),
        RequesterUserId: ACTOR,
        Action: ActionCode.Approve,
        TargetObjectType: ObjectType.ExceptionCase,
        TargetObjectId: 'x',
        Decision: ApprovalDecision.Pending,
        CreatedAt: now,
        UpdatedAt: now,
      });
      await approvalRepo.Seed(pending);
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval, { ApprovalRequestId: pending.Id });
      const useCase = buildResolve(repo, approvalRepo, new FakeReasonCatalog());
      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('resolves when the linked approval request is APPROVED', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const now = new Date();
      const approvalId = randomUUID();
      const entity = await seedCase(repo, ExceptionState.InReviewPendingApproval, { ApprovalRequestId: approvalId });
      const approved = new ApprovalRequestEntity({
        Id: approvalId,
        RequesterUserId: ACTOR,
        Action: ActionCode.Approve,
        TargetObjectType: ObjectType.ExceptionCase,
        TargetObjectId: entity.Id,
        Decision: ApprovalDecision.Approved,
        CreatedAt: now,
        UpdatedAt: now,
      });
      await approvalRepo.Seed(approved);
      const useCase = buildResolve(repo, approvalRepo, new FakeReasonCatalog());
      const dto = await useCase.Execute({ Id: entity.Id }, ctx());
      expect(dto.State).toBe(ExceptionState.Resolved);
    });
  });

  // ---------- AC4/AC5: Close re-checks evidence/approval ----------
  describe('CloseExceptionUseCase (AC4)', () => {
    it('closes a RESOLVED case with no missing requirements', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Resolved);
      const stub = new StubAuditedTransaction();
      const useCase = new CloseExceptionUseCase(
        repo,
        new FakeControlExceptionCatalog(),
        approvalRepo,
        stub as unknown as AuditedTransaction,
      );
      const dto = await useCase.Execute({ Id: entity.Id }, ctx());
      expect(dto.State).toBe(ExceptionState.Closed);
      expect(dto.ClosedAt).not.toBeNull();
      expect(stub.Entries[0].Action).toBe(ActionCode.Update);
    });

    it('blocks close when EvidenceRequired and the case carries no evidence (CTRL-EX-04 closure control)', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Resolved);
      const useCase = new CloseExceptionUseCase(
        repo,
        new FakeControlExceptionCatalog(catalogEntry({ EvidenceRequired: true })),
        approvalRepo,
      );
      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('rejects an illegal close edge (ASSIGNED -> CLOSED)', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const approvalRepo = new InMemoryApprovalRequestRepository();
      const entity = await seedCase(repo, ExceptionState.Assigned);
      const useCase = new CloseExceptionUseCase(repo, new FakeControlExceptionCatalog(), approvalRepo);
      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    });
  });

  // ---------- Get / List ----------
  describe('Get / List', () => {
    it('Get returns the case DTO; List filters by State', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const detected = await seedCase(repo, ExceptionState.Detected);
      await seedCase(repo, ExceptionState.Closed);

      const got = await new GetExceptionUseCase(repo).Execute(detected.Id);
      expect(got.Id).toBe(detected.Id);

      const list = await new ListExceptionsUseCase(repo).Execute({ State: ExceptionState.Detected });
      expect(list.Items).toHaveLength(1);
      expect(list.Items[0].State).toBe(ExceptionState.Detected);
      expect(list.Meta.TotalItems).toBe(1);
    });

    it('Get throws NotFound for a missing case', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      await expect(new GetExceptionUseCase(repo).Execute('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------- AC2/AC4: concurrency guard (TOCTOU) ----------
  describe('transition concurrency guard (TOCTOU)', () => {
    it('aborts when the case state changed concurrently — locked in-tx re-check, no audit row', async () => {
      const repo = new InMemoryExceptionCaseRepository();
      const entity = await seedCase(repo, ExceptionState.Detected);
      const stub = new StubAuditedTransaction();
      // Simulate a concurrent transition committed first: the locked in-transaction read sees a
      // state other than the one asserted before the transaction opened.
      repo.FindByIdForUpdate = async () => new ExceptionCaseEntity({ ...entity, State: ExceptionState.Logged });
      const useCase = new LogExceptionUseCase(repo, stub as unknown as AuditedTransaction);

      await expect(useCase.Execute({ Id: entity.Id }, ctx())).rejects.toBeInstanceOf(BusinessRuleException);
      expect(stub.Entries).toHaveLength(0);
    });
  });
});
