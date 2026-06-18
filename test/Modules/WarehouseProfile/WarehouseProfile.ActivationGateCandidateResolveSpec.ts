import { BusinessRuleException } from '@common/Exceptions/AppException';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import { BuildBinding, BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * Regression guard for the AC2 over-tick: the activation conflict/hard-block gate MUST evaluate
 * the rules of the profile being activated. Before the fix, ProfileActivationGuard ran the preview
 * through the B3 resolver, which only resolves ACTIVE profiles via ListActiveByScope. At activation
 * the candidate is still DRAFT, so the resolver returned an EMPTY decision (Winner=null) or resolved
 * a DIFFERENT active profile — the gate passed vacuously and never saw the candidate's own rules.
 *
 * These specs drive the candidate's own rules through the REAL resolver (no hand-authored
 * RuleDecision stub), so deleting the gate body would make them fail.
 */

const now = new Date('2026-01-01T00:00:00.000Z');
const scopeKeyService = new ScopeKeyService();
const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function BuildDraftProfile(id: string, effectiveFrom: Date): WarehouseProfileEntity {
  return new WarehouseProfileEntity({
    Id: id,
    ProfileCode: `WP-${id}`,
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
}

async function ActiveGroup(groups: InMemoryRuleGroupRepository): Promise<void> {
  await groups.Create(
    new RuleGroupEntity({
      Id: 'group-active',
      GroupCode: 'R-COM',
      GroupName: 'Compliance',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );
}

describe('RuleResolver self-check by ProfileId (AC2 candidate-resolve path)', () => {
  it('resolves the rules of a DRAFT profile targeted by ProfileId, even though it is not ACTIVE', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const defs = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await ActiveGroup(groups);

    const draft = BuildDraftProfile('p-draft', D('2026-01-01'));
    await profiles.Create(draft);

    const block = BuildRule({
      RuleCode: 'OP-BLOCK',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    await defs.Create(block);
    await bindings.Create(BuildBinding(draft.Id, block.Id));

    const resolver = new RuleResolver(profiles, defs, bindings, groups, new ConditionEvaluator());

    // Without ProfileId the DRAFT profile is invisible (ListActiveByScope filters Status=ACTIVE).
    const byScope = await resolver.Resolve({ WarehouseTypeCode: 'TIER_1', EvaluatedAt: D('2026-02-01') });
    expect(byScope.Winner).toBeNull();

    // With ProfileId the resolver targets the DRAFT candidate and surfaces its own bound rule.
    const byProfile = await resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
      ProfileId: draft.Id,
      EvaluatedAt: D('2026-02-01'),
    });
    expect(byProfile.Winner?.RuleCode).toBe('OP-BLOCK');
  });
});

describe('ProfileActivationGuard.AssertActivatable through the REAL resolver (AC2 not vacuous)', () => {
  function BuildGuard(
    profiles: InMemoryWarehouseProfileRepository,
    defs: InMemoryRuleDefinitionRepository,
    bindings: InMemoryWarehouseProfileRuleRepository,
    groups: InMemoryRuleGroupRepository,
  ): ProfileActivationGuard {
    const resolver = new RuleResolver(profiles, defs, bindings, groups, new ConditionEvaluator());
    const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
    return new ProfileActivationGuard(profiles, preview);
  }

  it('BLOCKS a DRAFT candidate whose OWN bound rule is a non-Compliance hard block', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const defs = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await ActiveGroup(groups);

    const candidate = BuildDraftProfile('p-candidate', D('2026-01-01'));
    await profiles.Create(candidate);

    const opBlock = BuildRule({
      RuleCode: 'OP-BLOCK',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    await defs.Create(opBlock);
    await bindings.Create(BuildBinding(candidate.Id, opBlock.Id));

    const guard = BuildGuard(profiles, defs, bindings, groups);

    // Before the fix the gate resolved an empty decision (DRAFT invisible) and passed -> this rejected.
    await expect(guard.AssertActivatable(candidate)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('ALLOWS a DRAFT candidate whose OWN bound rule is a benign soft warning', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const defs = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await ActiveGroup(groups);

    const candidate = BuildDraftProfile('p-candidate', D('2026-01-01'));
    await profiles.Create(candidate);

    const softWarning = BuildRule({
      RuleCode: 'OP-WARN',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    await defs.Create(softWarning);
    await bindings.Create(BuildBinding(candidate.Id, softWarning.Id));

    const guard = BuildGuard(profiles, defs, bindings, groups);

    await expect(guard.AssertActivatable(candidate)).resolves.toBeUndefined();
  });
});
