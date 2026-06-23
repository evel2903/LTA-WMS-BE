import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import { StubRuleResolver } from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const scopeKeyService = new ScopeKeyService();
const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function SeedProfile(
  repo: IWarehouseProfileRepository,
  params: {
    Id: string;
    Status?: WarehouseProfileStatus;
    WarehouseTypeCode?: string;
    WarehouseId?: string | null;
    EffectiveFrom?: Date;
    EffectiveTo?: Date | null;
  },
): Promise<WarehouseProfileEntity> {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const profile = new WarehouseProfileEntity({
    Id: params.Id,
    ProfileCode: `WP-${params.Id}`,
    ProfileName: `Profile ${params.Id}`,
    WarehouseTypeCode: params.WarehouseTypeCode ?? 'TIER_1',
    Version: 1,
    Status: params.Status ?? WarehouseProfileStatus.Draft,
    WarehouseId: params.WarehouseId ?? null,
    ScopeKey: scopeKeyService.Build({
      WarehouseTypeCode: params.WarehouseTypeCode ?? 'TIER_1',
      WarehouseId: params.WarehouseId,
    }),
    EffectiveFrom: params.EffectiveFrom ?? D('2026-01-01'),
    EffectiveTo: params.EffectiveTo ?? null,
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: 'creator',
    UpdatedBy: 'creator',
  });
  return repo.Create(profile);
}

/** Clean preview: single SoftWarning winner, no conflicts -> activation gate passes. */
function CleanPreview(): PreviewRuleResolutionUseCase {
  const winner = BuildRule({
    RuleCode: 'OP-CLEAN',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
  });
  const resolver = new StubRuleResolver({
    Winner: winner,
    Allowed: true,
    ApprovalRequired: false,
    OrderedCandidates: [winner],
    EffectivePriorities: { [winner.Id]: winner.Priority },
    ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
  });
  return new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
}

function BuildUseCase(
  repo: IWarehouseProfileRepository,
  preview: PreviewRuleResolutionUseCase = CleanPreview(),
): ActivateWarehouseProfileUseCase {
  const guard = new ProfileActivationGuard(repo, preview);
  return new ActivateWarehouseProfileUseCase(repo, new WarehouseProfilePolicyValidator(), guard);
}

describe('ActivateWarehouseProfileUseCase (AC1/AC2/AC4)', () => {
  let repo: IWarehouseProfileRepository;

  beforeEach(() => {
    repo = new InMemoryWarehouseProfileRepository();
  });

  it('transitions DRAFT -> ACTIVE and persists the new status (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-1' });

    const result = await BuildUseCase(repo).Execute({ Id: 'p-1' });

    expect(result.Status).toBe(WarehouseProfileStatus.Active);
    const reloaded = await repo.FindById('p-1');
    expect(reloaded?.Status).toBe(WarehouseProfileStatus.Active);
  });

  it('throws NotFoundException when the profile id does not exist (AC1)', async () => {
    await expect(BuildUseCase(repo).Execute({ Id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects activating a RETIRED profile with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-retired', Status: WarehouseProfileStatus.Retired });
    await expect(BuildUseCase(repo).Execute({ Id: 'p-retired' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects activating an EXPIRED profile with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-expired', Status: WarehouseProfileStatus.Expired });
    await expect(BuildUseCase(repo).Execute({ Id: 'p-expired' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects re-activating an already ACTIVE profile with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-active', Status: WarehouseProfileStatus.Active });
    await expect(BuildUseCase(repo).Execute({ Id: 'p-active' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects an invalid effective window (EffectiveTo <= EffectiveFrom) with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-1' });
    await expect(
      BuildUseCase(repo).Execute({ Id: 'p-1', EffectiveFrom: '2026-06-01', EffectiveTo: '2026-06-01' }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('blocks activation with ConflictException when another ACTIVE profile overlaps the same scope/window (AC1)', async () => {
    await SeedProfile(repo, {
      Id: 'p-active',
      Status: WarehouseProfileStatus.Active,
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
    });
    await SeedProfile(repo, {
      Id: 'p-draft',
      Status: WarehouseProfileStatus.Draft,
      EffectiveFrom: D('2026-06-01'),
      EffectiveTo: null,
    });

    await expect(BuildUseCase(repo).Execute({ Id: 'p-draft' })).rejects.toBeInstanceOf(ConflictException);
    const stillDraft = await repo.FindById('p-draft');
    expect(stillDraft?.Status).toBe(WarehouseProfileStatus.Draft);
  });

  it('blocks activation with ConflictException when the preview still reports a serious conflict; profile stays DRAFT (AC2)', async () => {
    await SeedProfile(repo, { Id: 'p-1' });
    const approval = BuildRule({
      RuleCode: 'OWN-APPROVAL',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
    });
    const warning = BuildRule({
      RuleCode: 'OWN-WARNING',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    const conflictPreview = new PreviewRuleResolutionUseCase(
      new StubRuleResolver({
        Winner: approval,
        Allowed: false,
        ApprovalRequired: true,
        OrderedCandidates: [approval, warning],
        EffectivePriorities: { [approval.Id]: approval.Priority, [warning.Id]: warning.Priority },
        ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
      }),
      new RuleConflictDetector(),
    );

    await expect(BuildUseCase(repo, conflictPreview).Execute({ Id: 'p-1' })).rejects.toBeInstanceOf(ConflictException);
    const stillDraft = await repo.FindById('p-1');
    expect(stillDraft?.Status).toBe(WarehouseProfileStatus.Draft);
  });

  it('blocks activation with BusinessRuleException when the preview winner is a non-Compliance hard block (AC2)', async () => {
    await SeedProfile(repo, { Id: 'p-1' });
    const opBlock = BuildRule({
      RuleCode: 'OP-BLOCK',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const misconfigPreview = new PreviewRuleResolutionUseCase(
      new StubRuleResolver({
        Winner: opBlock,
        Allowed: false,
        ApprovalRequired: false,
        OrderedCandidates: [opBlock],
        EffectivePriorities: { [opBlock.Id]: opBlock.Priority },
        ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
      }),
      new RuleConflictDetector(),
    );

    await expect(BuildUseCase(repo, misconfigPreview).Execute({ Id: 'p-1' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('stores activation actor/reason context in audit_policy.LastActivation and reads it back (AC4)', async () => {
    await SeedProfile(repo, { Id: 'p-1' });

    await BuildUseCase(repo).Execute({
      Id: 'p-1',
      ActorUserId: 'admin-7',
      ReasonCode: 'GO_LIVE',
      ReasonNote: 'Tier 1 launch',
    });

    const reloaded = await repo.FindById('p-1');
    const lastActivation = reloaded?.AuditPolicy.LastActivation as Record<string, unknown> | undefined;
    expect(lastActivation).toBeDefined();
    expect(lastActivation?.ActorUserId).toBe('admin-7');
    expect(lastActivation?.ReasonCode).toBe('GO_LIVE');
    expect(lastActivation?.ReasonNote).toBe('Tier 1 launch');
    expect(typeof lastActivation?.ActivatedAt).toBe('string');
  });

  it('updates UpdatedBy/UpdatedAt to the actor and transition time (AC4)', async () => {
    const seeded = await SeedProfile(repo, { Id: 'p-1' });
    const before = seeded.UpdatedAt.getTime();

    const result = await BuildUseCase(repo).Execute({ Id: 'p-1', ActorUserId: 'admin-7' });

    const reloaded = await repo.FindById('p-1');
    expect(reloaded?.UpdatedBy).toBe('admin-7');
    expect(reloaded!.UpdatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.Status).toBe(WarehouseProfileStatus.Active);
  });

  it('allows overriding the effective window at activation and re-validates it (AC1)', async () => {
    await SeedProfile(repo, { Id: 'p-1', EffectiveFrom: D('2026-01-01'), EffectiveTo: null });

    const result = await BuildUseCase(repo).Execute({
      Id: 'p-1',
      EffectiveFrom: '2026-03-01',
      EffectiveTo: '2026-09-01',
    });

    expect(result.EffectiveFrom).toBe('2026-03-01');
    expect(result.EffectiveTo).toBe('2026-09-01');
    expect(result.Status).toBe(WarehouseProfileStatus.Active);
  });
});
