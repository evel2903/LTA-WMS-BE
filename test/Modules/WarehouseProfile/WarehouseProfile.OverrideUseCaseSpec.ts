import { randomUUID } from 'crypto';
import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
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
import { StubAuditedTransaction } from '@modules/AccessControl/Test/AccessControlTestDoubles';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { RequestOverrideUseCase } from '@modules/WarehouseProfile/Application/UseCases/RequestOverrideUseCase';
import { GetOverrideLogUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetOverrideLogUseCase';
import { ListOverrideLogsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListOverrideLogsUseCase';
import {
  InMemoryOverrideLogRepository,
  InMemoryRuleDefinitionRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const ACTOR = 'actor-1';

const ctx = (actor: string | null = ACTOR): AuditContext => ({
  ActorUserId: actor,
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-c7',
  RequestId: 'req-c7',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
});

class FakePermissionChecker implements IPermissionChecker {
  public LastContext: PermissionCheckContext | null = null;
  constructor(private readonly allowed = true) {}
  public async Check(context: PermissionCheckContext): Promise<PermissionDecision> {
    this.LastContext = context;
    return this.allowed ? { Allowed: true } : { Allowed: false, Reason: 'OUT_OF_SCOPE' };
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public LastInput: ValidateReasonInput | null = null;
  constructor(
    private readonly result: ValidateReasonResult = {
      ReasonCodeId: 'rc-override-id',
      EvidenceRequired: false,
      ApprovalRequired: false,
    },
  ) {}
  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    this.LastInput = input;
    return this.result;
  }
}

/** Approval repo double exposing only FindById (the rest of IApprovalRequestRepository is unused here). */
const approvalRepo = (entity: ApprovalRequestEntity | null): IApprovalRequestRepository =>
  ({
    FindById: async () => entity,
  }) as unknown as IApprovalRequestRepository;

const approvedApproval = (targetObjectId: string): ApprovalRequestEntity => {
  const now = new Date();
  return new ApprovalRequestEntity({
    Id: randomUUID(),
    RequesterUserId: 'requester',
    Action: ActionCode.Override,
    TargetObjectType: ObjectType.Location,
    TargetObjectId: targetObjectId,
    Decision: ApprovalDecision.Approved,
    CreatedAt: now,
    UpdatedAt: now,
  });
};

const seedRule = async (repo: InMemoryRuleDefinitionRepository, rule = BuildRule({ AllowOverride: true })) => {
  await repo.Create(rule);
  return rule;
};

const baseRequest = (ruleId: string) => ({
  RuleId: ruleId,
  TargetObjectType: ObjectType.Location,
  TargetObjectId: 'loc-1',
  TargetObjectCode: 'LOC-1',
});

describe('RequestOverrideUseCase (C7) — always-run unit', () => {
  // ---- AC2/AC5: success ----
  it('AC2/AC5: overrides a soft rule, writes an override_log + one Override audit entry in one tx', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ ControlMode: RuleControlMode.SoftWarning, AllowOverride: true }));
    const stub = new StubAuditedTransaction();
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      stub as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute(baseRequest(rule.Id), ctx());

    expect(dto.RuleId).toBe(rule.Id);
    expect(dto.RuleCode).toBe(rule.RuleCode);
    expect(dto.ActorUserId).toBe(ACTOR);
    expect(dto.AuditRef).toBe('corr-c7');
    // override_log persisted
    expect((await overrides.List(0, 10)).TotalItems).toBe(1);
    // exactly one Override audit entry in the same tx
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Override,
        ObjectType: ObjectType.OverrideLog,
        ObjectId: dto.Id,
        ActorUserId: ACTOR,
        ReferenceType: 'OverrideLog',
        ReferenceId: dto.Id,
      }),
    );
  });

  it('validates the override reason against (Override, Rule) — the pair the catalog seed satisfies', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ RequiresReason: true, AllowOverride: true }));
    const reasonCatalog = new FakeReasonCatalog();
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      reasonCatalog,
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await useCase.Execute({ ...baseRequest(rule.Id), ReasonCode: 'RC-RULE-OVERRIDE' }, ctx());

    expect(reasonCatalog.LastInput).toEqual(
      expect.objectContaining({ Action: ActionCode.Override, ObjectType: ObjectType.Rule }),
    );
  });

  it('checks permission for (Override, OverrideLog)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ AllowOverride: true }));
    const checker = new FakePermissionChecker(true);
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      checker,
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await useCase.Execute(baseRequest(rule.Id), ctx());

    expect(checker.LastContext).toEqual(
      expect.objectContaining({ Action: ActionCode.Override, ObjectType: ObjectType.OverrideLog, UserId: ACTOR }),
    );
  });

  // ---- AC3: never override compliance / hard-block / !AllowOverride ----
  it('AC3: blocks a HARD_BLOCK rule (OVERRIDE_NOT_ALLOWED), writes no override_log/audit', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ ControlMode: RuleControlMode.HardBlock, AllowOverride: true }));
    const stub = new StubAuditedTransaction();
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      stub as unknown as AuditedTransaction,
    );

    let caught: unknown;
    try {
      await useCase.Execute(baseRequest(rule.Id), ctx());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'OVERRIDE_NOT_ALLOWED' });
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
    expect(stub.Entries).toHaveLength(0);
  });

  it('AC3: blocks a Compliance-tier rule even if not hard-block (OVERRIDE_NOT_ALLOWED)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(
      rules,
      BuildRule({
        PrecedenceTier: RulePrecedenceTier.Compliance,
        ControlMode: RuleControlMode.SoftWarning,
        AllowOverride: true,
      }),
    );
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(rule.Id), ctx())).rejects.toMatchObject({
      Details: { Reason: 'OVERRIDE_NOT_ALLOWED' },
    });
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  it('AC3: blocks when the rule has AllowOverride=false (OVERRIDE_NOT_ALLOWED)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ ControlMode: RuleControlMode.SoftWarning, AllowOverride: false }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(rule.Id), ctx())).rejects.toMatchObject({
      Details: { Reason: 'OVERRIDE_NOT_ALLOWED' },
    });
  });

  it('throws NotFound when the rule does not exist', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(randomUUID()), ctx())).rejects.toBeInstanceOf(NotFoundException);
  });

  // ---- AC4: missing permission / reason / evidence / approval ----
  it('AC4: blocks (ForbiddenAppException reason) when permission is denied, writes no override_log', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ AllowOverride: true }));
    const stub = new StubAuditedTransaction();
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(false),
      new FakeReasonCatalog(),
      approvalRepo(null),
      stub as unknown as AuditedTransaction,
    );

    let caught: unknown;
    try {
      await useCase.Execute(baseRequest(rule.Id), ctx());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'OUT_OF_SCOPE' });
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
    expect(stub.Entries).toHaveLength(0);
  });

  it('AC4: blocks when the rule RequiresReason but no reason code is supplied', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ RequiresReason: true, AllowOverride: true }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(rule.Id), ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  it('AC4: blocks when the rule RequiresEvidence but none is supplied', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ RequiresEvidence: true, AllowOverride: true }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(
      useCase.Execute({ ...baseRequest(rule.Id), ReasonCode: 'RC-RULE-OVERRIDE' }, ctx()),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('AC4: blocks when the validated reason requires evidence but none is supplied', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ AllowOverride: true }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog({ ReasonCodeId: 'rc-ev', EvidenceRequired: true, ApprovalRequired: false }),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(
      useCase.Execute({ ...baseRequest(rule.Id), ReasonCode: 'RC-RULE-OVERRIDE' }, ctx()),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('AC4: allows when evidence is required AND supplied', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ RequiresEvidence: true, AllowOverride: true }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute(
      { ...baseRequest(rule.Id), ReasonCode: 'RC-RULE-OVERRIDE', EvidenceRefs: [{ url: 'photo://1' }] },
      ctx(),
    );
    expect(dto.EvidenceRefs).toEqual([{ url: 'photo://1' }]);
  });

  it('AC4: blocks an APPROVAL_REQUIRED rule when no ApprovalRequestId is supplied', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(
      rules,
      BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true }),
    );
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(rule.Id), ctx())).rejects.toBeInstanceOf(BusinessRuleException);
    expect((await overrides.List(0, 10)).TotalItems).toBe(0);
  });

  it('AC4: blocks an APPROVAL_REQUIRED rule when the referenced approval is not APPROVED', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(
      rules,
      BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true }),
    );
    const now = new Date();
    const pending = new ApprovalRequestEntity({
      Id: randomUUID(),
      RequesterUserId: 'requester',
      Action: ActionCode.Override,
      TargetObjectType: ObjectType.Rule,
      TargetObjectId: 'loc-1',
      Decision: ApprovalDecision.Pending,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(pending),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(
      useCase.Execute({ ...baseRequest(rule.Id), ApprovalRequestId: pending.Id }, ctx()),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('AC2: allows an APPROVAL_REQUIRED rule when an APPROVED approval matching the target is referenced', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(
      rules,
      BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true }),
    );
    const approval = approvedApproval('loc-1');
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(approval),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    const dto = await useCase.Execute({ ...baseRequest(rule.Id), ApprovalRequestId: approval.Id }, ctx());
    expect(dto.ApprovalRequestId).toBe(approval.Id);
    expect((await overrides.List(0, 10)).TotalItems).toBe(1);
  });

  it('AC4: blocks an APPROVAL_REQUIRED rule when the approval target does not match', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(
      rules,
      BuildRule({ ControlMode: RuleControlMode.ApprovalRequired, AllowOverride: true }),
    );
    const approval = approvedApproval('SOME-OTHER-TARGET');
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(approval),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(
      useCase.Execute({ ...baseRequest(rule.Id), ApprovalRequestId: approval.Id }, ctx()),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('blocks when there is no authenticated actor (PERMISSION_DENIED)', async () => {
    const rules = new InMemoryRuleDefinitionRepository();
    const overrides = new InMemoryOverrideLogRepository();
    const rule = await seedRule(rules, BuildRule({ AllowOverride: true }));
    const useCase = new RequestOverrideUseCase(
      rules,
      overrides,
      new FakePermissionChecker(true),
      new FakeReasonCatalog(),
      approvalRepo(null),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute(baseRequest(rule.Id), ctx(null))).rejects.toMatchObject({
      Details: { Reason: 'PERMISSION_DENIED' },
    });
  });
});

describe('Get/List override logs (C7) — always-run unit', () => {
  const seedLog = (overrides: { RuleId?: string; ActorUserId?: string }) =>
    new OverrideLogEntity({
      Id: randomUUID(),
      RuleId: overrides.RuleId ?? randomUUID(),
      RuleCode: 'RULE-X',
      ActorUserId: overrides.ActorUserId ?? ACTOR,
      TargetObjectType: ObjectType.Location,
      TargetObjectId: 'loc-1',
      ControlMode: RuleControlMode.SoftWarning,
      CreatedAt: new Date(),
    });

  it('Get returns the override log DTO; NotFound when missing', async () => {
    const repo = new InMemoryOverrideLogRepository();
    const log = seedLog({});
    await repo.Seed(log);

    const got = await new GetOverrideLogUseCase(repo).Execute(log.Id);
    expect(got.Id).toBe(log.Id);

    await expect(new GetOverrideLogUseCase(repo).Execute(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('List filters by RuleId (FR-19 frequency query)', async () => {
    const repo = new InMemoryOverrideLogRepository();
    const ruleId = randomUUID();
    await repo.Seed(seedLog({ RuleId: ruleId }));
    await repo.Seed(seedLog({ RuleId: ruleId }));
    await repo.Seed(seedLog({ RuleId: randomUUID() }));

    const list = await new ListOverrideLogsUseCase(repo).Execute({ RuleId: ruleId });
    expect(list.Items).toHaveLength(2);
    expect(list.Meta.TotalItems).toBe(2);
  });
});
