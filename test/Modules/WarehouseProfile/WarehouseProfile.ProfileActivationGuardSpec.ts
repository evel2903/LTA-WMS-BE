import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import { StubRuleResolver } from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const scopeKeyService = new ScopeKeyService();

function BuildDraftProfile(params: {
  Id: string;
  WarehouseTypeCode?: string;
  WarehouseId?: string | null;
  EffectiveFrom: Date;
  EffectiveTo?: Date | null;
  Status?: WarehouseProfileStatus;
}): WarehouseProfileEntity {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return new WarehouseProfileEntity({
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
    EffectiveFrom: params.EffectiveFrom,
    EffectiveTo: params.EffectiveTo ?? null,
    CreatedAt: now,
    UpdatedAt: now,
  });
}

const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** A preview use case whose resolver returns a single SoftWarning winner with no conflicts (clean). */
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

describe('ProfileActivationGuard.AssertNoOverlap (overlap-by-window using ScopeKey, AC1)', () => {
  let repo: IWarehouseProfileRepository;
  let guard: ProfileActivationGuard;

  beforeEach(() => {
    repo = new InMemoryWarehouseProfileRepository();
    guard = new ProfileActivationGuard(repo, CleanPreview());
  });

  it('blocks when another ACTIVE profile shares the ScopeKey and the windows overlap', async () => {
    const existing = BuildDraftProfile({
      Id: 'p-existing',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: D('2026-12-31'),
      Status: WarehouseProfileStatus.Active,
    });
    await repo.Create(existing);

    const candidate = BuildDraftProfile({
      Id: 'p-candidate',
      EffectiveFrom: D('2026-06-01'),
      EffectiveTo: D('2027-01-01'),
    });

    await expect(guard.AssertNoOverlap(candidate)).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows when the other ACTIVE profile has a different ScopeKey', async () => {
    const existing = BuildDraftProfile({
      Id: 'p-existing',
      WarehouseId: 'wh-A',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
      Status: WarehouseProfileStatus.Active,
    });
    await repo.Create(existing);

    const candidate = BuildDraftProfile({
      Id: 'p-candidate',
      WarehouseId: 'wh-B',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
    });

    await expect(guard.AssertNoOverlap(candidate)).resolves.toBeUndefined();
  });

  it('allows when the windows are disjoint (existing.to <= candidate.from, half-open)', async () => {
    const existing = BuildDraftProfile({
      Id: 'p-existing',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: D('2026-06-01'),
      Status: WarehouseProfileStatus.Active,
    });
    await repo.Create(existing);

    // Half-open [from, to): existing ends exactly when candidate begins -> no overlap.
    const candidate = BuildDraftProfile({
      Id: 'p-candidate',
      EffectiveFrom: D('2026-06-01'),
      EffectiveTo: null,
    });

    await expect(guard.AssertNoOverlap(candidate)).resolves.toBeUndefined();
  });

  it('treats EffectiveTo=null as +infinity so any later window overlaps it', async () => {
    const existing = BuildDraftProfile({
      Id: 'p-existing',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
      Status: WarehouseProfileStatus.Active,
    });
    await repo.Create(existing);

    const candidate = BuildDraftProfile({
      Id: 'p-candidate',
      EffectiveFrom: D('2030-01-01'),
      EffectiveTo: D('2031-01-01'),
    });

    await expect(guard.AssertNoOverlap(candidate)).rejects.toBeInstanceOf(ConflictException);
  });

  it('excludes the profile itself (re-checking an already-active profile against itself does not conflict)', async () => {
    const self = BuildDraftProfile({
      Id: 'p-self',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
      Status: WarehouseProfileStatus.Active,
    });
    await repo.Create(self);

    await expect(guard.AssertNoOverlap(self)).resolves.toBeUndefined();
  });

  it('ignores non-ACTIVE profiles sharing the scope/window (only ACTIVE ones block)', async () => {
    const draftSameScope = BuildDraftProfile({
      Id: 'p-draft',
      EffectiveFrom: D('2026-01-01'),
      EffectiveTo: null,
      Status: WarehouseProfileStatus.Draft,
    });
    await repo.Create(draftSameScope);

    const candidate = BuildDraftProfile({
      Id: 'p-candidate',
      EffectiveFrom: D('2026-06-01'),
      EffectiveTo: null,
    });

    await expect(guard.AssertNoOverlap(candidate)).resolves.toBeUndefined();
  });
});

describe('ProfileActivationGuard.AssertActivatable (conflict + hard-block gate reusing preview, AC2)', () => {
  const repo = new InMemoryWarehouseProfileRepository();

  function GuardWith(decision: RuleDecision): ProfileActivationGuard {
    const resolver = new StubRuleResolver(decision);
    return new ProfileActivationGuard(repo, new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector()));
  }

  const profile = BuildDraftProfile({ Id: 'p-1', EffectiveFrom: D('2026-01-01'), EffectiveTo: null });

  it('blocks with ConflictException when preview reports a same-scope same-category conflict', async () => {
    // Two divergent Owner/Contract rules on the same scope -> RuleConflictDetector reports a conflict.
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
    const guard = GuardWith({
      Winner: approval,
      Allowed: false,
      ApprovalRequired: true,
      OrderedCandidates: [approval, warning],
      EffectivePriorities: { [approval.Id]: approval.Priority, [warning.Id]: warning.Priority },
      ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
    });

    const error = await guard.AssertActivatable(profile).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    // Details must carry the measured conflicts so the client knows why.
    expect((error as ConflictException).Details).toBeDefined();
  });

  it('blocks with BusinessRuleException when the self-check winner is a NON-Compliance hard block (misconfig)', async () => {
    const opBlock = BuildRule({
      RuleCode: 'OP-BLOCK',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const guard = GuardWith({
      Winner: opBlock,
      Allowed: false,
      ApprovalRequired: false,
      OrderedCandidates: [opBlock],
      EffectivePriorities: { [opBlock.Id]: opBlock.Priority },
      ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
    });

    await expect(guard.AssertActivatable(profile)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('ALLOWS a Compliance hard block (legitimate, not a misconfig per precedence handoff rule)', async () => {
    const complianceBlock = BuildRule({
      RuleCode: 'COM-BLOCK',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const guard = GuardWith({
      Winner: complianceBlock,
      Allowed: false,
      ApprovalRequired: false,
      OrderedCandidates: [complianceBlock],
      EffectivePriorities: { [complianceBlock.Id]: complianceBlock.Priority },
      ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
    });

    await expect(guard.AssertActivatable(profile)).resolves.toBeUndefined();
  });

  it('allows when the preview is clean (no conflicts, no misconfig hard block)', async () => {
    const guard = new ProfileActivationGuard(repo, CleanPreview());
    await expect(guard.AssertActivatable(profile)).resolves.toBeUndefined();
  });
});
