import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { FakeAuditWriter, StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { RemoveWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/RemoveWarehouseProfileRuleUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import {
  InMemoryWarehouseProfileAssignmentRepository,
  InMemoryWarehouseProfileRepository,
} from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
  StubRuleResolver,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { BuildBinding, BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * C5 audit proof for the WarehouseProfile audit-only use cases. Each spec runs always (no DB): the
 * mutation use cases capture their audit entry through a StubAuditedTransaction, and the activation
 * use case (which appends inside the repository transaction instead of an AuditedTransaction) is
 * driven with a FakeAuditWriter. We assert the captured AuditEntry shape (Action / ObjectType /
 * ObjectCode / actor / before+after image) rather than any DB row.
 */

const ctx: AuditContext = {
  ActorUserId: 'u-wp',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-wp',
  RequestId: 'req-wp',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const scopeKeyService = new ScopeKeyService();

// Master-data ports are only touched when a profile carries a non-null scope reference. Every
// profile under test scopes by WarehouseTypeCode only, so these never fire — but the use case
// constructors require them, so we supply inert stubs.
const inertWarehouseRepo = (): IWarehouseRepository =>
  ({
    FindById: jest.fn(async () => null),
    FindByCode: jest.fn(async () => null),
    Create: jest.fn(async (w: WarehouseEntity) => w),
    Update: jest.fn(async (w: WarehouseEntity) => w),
    List: jest.fn(async () => ({ Items: [], TotalItems: 0 })),
  }) as unknown as IWarehouseRepository;

const inertZoneRepo = (): IZoneRepository => ({ FindById: jest.fn(async () => null) }) as unknown as IZoneRepository;

const inertOwnerRepo = (): IOwnerRepository => ({ FindById: jest.fn(async () => null) }) as unknown as IOwnerRepository;

const inertSkuRepo = (): ISkuRepository => ({ FindById: jest.fn(async () => null) }) as unknown as ISkuRepository;

const buildDraftProfile = (id: string, code: string, effectiveFrom: Date): WarehouseProfileEntity => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return new WarehouseProfileEntity({
    Id: id,
    ProfileCode: code,
    ProfileName: `Profile ${id}`,
    WarehouseTypeCode: 'TIER_1',
    Version: 1,
    Status: WarehouseProfileStatus.Draft,
    WarehouseId: null,
    ScopeKey: scopeKeyService.Build({ WarehouseTypeCode: 'TIER_1' }),
    EffectiveFrom: effectiveFrom,
    EffectiveTo: null,
    CreatedAt: now,
    UpdatedAt: now,
  });
};

const buildActiveProfile = (id: string, code: string): WarehouseProfileEntity => {
  const profile = buildDraftProfile(id, code, new Date('2026-01-01T00:00:00.000Z'));
  profile.Status = WarehouseProfileStatus.Active;
  return profile;
};

// Clean preview: a single soft-warning operation winner with no conflicts, so the activation guard's
// self-check passes (mirrors WarehouseProfile.ActivationTransactionSpec).
const cleanPreview = (): PreviewRuleResolutionUseCase => {
  const winner = BuildRule({
    RuleCode: 'OP-CLEAN',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
  });
  return new PreviewRuleResolutionUseCase(
    new StubRuleResolver({
      Winner: winner,
      Allowed: true,
      ApprovalRequired: false,
      OrderedCandidates: [winner],
      EffectivePriorities: { [winner.Id]: winner.Priority },
      ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
    }),
    new RuleConflictDetector(),
  );
};

describe('WarehouseProfile audit-only use cases build the correct audit entry (C5)', () => {
  it('Create writes one Create / WarehouseProfile entry with after-image, profile code, and actor', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    const useCase = new CreateWarehouseProfileUseCase(
      profileRepo,
      inertWarehouseRepo(),
      inertZoneRepo(),
      inertOwnerRepo(),
      inertSkuRepo(),
      scopeKeyService,
      new WarehouseProfilePolicyValidator(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute(
      {
        ProfileCode: 'WP-CREATE',
        ProfileName: 'Created profile',
        WarehouseTypeCode: 'TIER_1',
        EffectiveFrom: '2026-01-01',
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectCode: 'WP-CREATE',
        ActorUserId: 'u-wp',
        CorrelationId: 'corr-wp',
      }),
    );
    expect(stub.Entries[0].AfterJson).toMatchObject({ ProfileCode: 'WP-CREATE', Status: WarehouseProfileStatus.Draft });
    expect(stub.Entries[0].BeforeJson).toBeUndefined();
  });

  it('Update writes an Update / WarehouseProfile entry with BOTH before and after image', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    await profileRepo.Create(buildDraftProfile('p-upd', 'WP-UPDATE', new Date('2026-01-01T00:00:00.000Z')));

    const useCase = new UpdateWarehouseProfileUseCase(
      profileRepo,
      inertWarehouseRepo(),
      inertZoneRepo(),
      inertOwnerRepo(),
      inertSkuRepo(),
      scopeKeyService,
      new WarehouseProfilePolicyValidator(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute({ Id: 'p-upd', ProfileName: 'Renamed profile' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectCode: 'WP-UPDATE',
        ActorUserId: 'u-wp',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toMatchObject({ ProfileName: 'Profile p-upd' });
    expect(stub.Entries[0].AfterJson).toMatchObject({ ProfileName: 'Renamed profile' });
  });

  it('Deactivate writes an Update entry moving status ACTIVE -> RETIRED with before+after image', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    await profileRepo.Create(buildActiveProfile('p-deact', 'WP-DEACT'));

    const useCase = new DeactivateWarehouseProfileUseCase(profileRepo, stub as unknown as AuditedTransaction);

    await useCase.Execute({ Id: 'p-deact', ActorUserId: 'u-wp', ReasonNote: 'no longer used' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectCode: 'WP-DEACT',
        ActorUserId: 'u-wp',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toMatchObject({ Status: WarehouseProfileStatus.Active });
    expect(stub.Entries[0].AfterJson).toMatchObject({ Status: WarehouseProfileStatus.Retired });
  });

  it('AddRule writes a Create / Rule entry with after-image of the binding', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    const bindingRepo = new InMemoryWarehouseProfileRuleRepository();
    const definitionRepo = new InMemoryRuleDefinitionRepository();
    await profileRepo.Create(buildActiveProfile('p-add', 'WP-ADD'));
    const definition = BuildRule({ Id: 'rd-add', RuleCode: 'RULE-ADD', WarehouseTypeCode: 'TIER_1' });
    await definitionRepo.Create(definition);

    const useCase = new AddWarehouseProfileRuleUseCase(
      bindingRepo,
      profileRepo,
      definitionRepo,
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute({ WarehouseProfileId: 'p-add', RuleDefinitionId: 'rd-add' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.Rule,
        ActorUserId: 'u-wp',
      }),
    );
    expect(stub.Entries[0].AfterJson).toMatchObject({ WarehouseProfileId: 'p-add', RuleDefinitionId: 'rd-add' });
  });

  it('RemoveRule writes a DeleteCancel / Rule entry with the before-image of the removed binding', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    const bindingRepo = new InMemoryWarehouseProfileRuleRepository();
    await profileRepo.Create(buildActiveProfile('p-rem', 'WP-REM'));
    const binding = BuildBinding('p-rem', 'rd-rem');
    await bindingRepo.Create(binding);

    const useCase = new RemoveWarehouseProfileRuleUseCase(
      bindingRepo,
      profileRepo,
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute('p-rem', binding.Id, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.Rule,
        ObjectId: binding.Id,
        ActorUserId: 'u-wp',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toMatchObject({
      Id: binding.Id,
      WarehouseProfileId: 'p-rem',
      RuleDefinitionId: 'rd-rem',
    });
  });

  it('CreateAssignment writes a Create / WarehouseProfile entry with ObjectCode = ScopeKey', async () => {
    const stub = new StubAuditedTransaction();
    const profileRepo = new InMemoryWarehouseProfileRepository();
    const assignmentRepo = new InMemoryWarehouseProfileAssignmentRepository();
    await profileRepo.Create(buildActiveProfile('p-asg', 'WP-ASG'));

    const useCase = new CreateWarehouseProfileAssignmentUseCase(
      assignmentRepo,
      profileRepo,
      inertWarehouseRepo(),
      scopeKeyService,
      stub as unknown as AuditedTransaction,
    );

    const expectedScopeKey = scopeKeyService.Build({ WarehouseTypeCode: 'TIER_1', WarehouseId: null });

    await useCase.Execute(
      { WarehouseProfileId: 'p-asg', AssignmentType: AssignmentType.WarehouseType, WarehouseTypeCode: 'TIER_1' },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectCode: expectedScopeKey,
        ActorUserId: 'u-wp',
      }),
    );
    expect(stub.Entries[0].AfterJson).toMatchObject({
      ScopeKey: expectedScopeKey,
      AssignmentType: AssignmentType.WarehouseType,
    });
  });

  it('Activate appends one Update entry via the IAuditWriter with DRAFT before-image and ACTIVE after-image', async () => {
    const profileRepo = new InMemoryWarehouseProfileRepository();
    await profileRepo.Create(buildDraftProfile('p-act', 'WP-ACT', new Date('2026-01-01T00:00:00.000Z')));

    const fakeAuditWriter = new FakeAuditWriter();
    const guard = new ProfileActivationGuard(profileRepo, cleanPreview());
    const useCase = new ActivateWarehouseProfileUseCase(
      profileRepo,
      new WarehouseProfilePolicyValidator(),
      guard,
      fakeAuditWriter,
    );

    const result = await useCase.Execute({ Id: 'p-act', ActorUserId: 'u-wp' }, ctx);

    expect(result.Status).toBe(WarehouseProfileStatus.Active);
    expect(fakeAuditWriter.Entries).toHaveLength(1);
    expect(fakeAuditWriter.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectCode: 'WP-ACT',
        ActorUserId: 'u-wp',
      }),
    );
    expect(fakeAuditWriter.Entries[0].BeforeJson).toMatchObject({ Status: WarehouseProfileStatus.Draft });
    expect(fakeAuditWriter.Entries[0].AfterJson).toMatchObject({ Status: WarehouseProfileStatus.Active });
  });
});
