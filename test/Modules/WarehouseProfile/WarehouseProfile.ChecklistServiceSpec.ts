import { randomUUID } from 'crypto';
import { WarehouseProfileChecklistService } from '@modules/WarehouseProfile/Application/Services/WarehouseProfileChecklistService';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';
import { ProfileChecklistItemCode } from '@modules/WarehouseProfile/Domain/Constants/ProfileChecklistItemCode';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { WarehouseProfileChecklistItemDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileChecklistDto';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import {
  BuildBinding,
  BuildProfile,
  BuildRule,
  At,
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * B7 AC1/AC2/AC3/AC4: the checklist service reads the B1-B5 surfaces and scores each item as
 * Pass/Fail/Warning/Deferred. It NEVER throws for a Fail/Warning (those are data); it never mutates;
 * it never re-implements precedence/conflict (reads RulePreviewResult).
 */

const ACTIVE_GROUP_ID = 'group-active';
const PLACEHOLDER_GROUP_ID = 'group-placeholder';

function ActiveGroup(): RuleGroupEntity {
  return new RuleGroupEntity({
    Id: ACTIVE_GROUP_ID,
    GroupCode: 'R-COM',
    GroupName: 'Compliance Rules',
    CatalogState: RuleGroupCatalogState.Active,
    CreatedAt: At,
    UpdatedAt: At,
  });
}

function PlaceholderGroup(): RuleGroupEntity {
  return new RuleGroupEntity({
    Id: PLACEHOLDER_GROUP_ID,
    GroupCode: 'R-INBOUND',
    GroupName: 'Inbound Rules',
    CatalogState: RuleGroupCatalogState.Placeholder,
    CreatedAt: At,
    UpdatedAt: At,
  });
}

type Harness = {
  service: WarehouseProfileChecklistService;
  profiles: InMemoryWarehouseProfileRepository;
  groups: InMemoryRuleGroupRepository;
  definitions: InMemoryRuleDefinitionRepository;
  bindings: InMemoryWarehouseProfileRuleRepository;
};

function NewHarness(): Harness {
  const profiles = new InMemoryWarehouseProfileRepository();
  const groups = new InMemoryRuleGroupRepository();
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
  const service = new WarehouseProfileChecklistService(profiles, groups, definitions, bindings, preview);
  return { service, profiles, groups, definitions, bindings };
}

function ItemOf(items: WarehouseProfileChecklistItemDto[], code: string): WarehouseProfileChecklistItemDto {
  const item = items.find((candidate) => candidate.Code === code);
  if (!item) {
    throw new Error(`Expected checklist item ${code} to be present`);
  }
  return item;
}

/** A fully-healthy Tier 1 active profile with one ACTIVE-group Operation rule bound. */
async function SeedHealthyProfile(harness: Harness, ownerId: string | null = null) {
  await harness.groups.Create(ActiveGroup());
  const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
  if (ownerId !== null) {
    profile.OwnerId = ownerId;
  }
  await harness.profiles.Create(profile);
  const rule = BuildRule({
    RuleCode: 'OP-OK',
    RuleGroupId: ACTIVE_GROUP_ID,
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
    OwnerId: ownerId,
  });
  await harness.definitions.Create(rule);
  await harness.bindings.Create(BuildBinding(profile.Id, rule.Id));
  return { profile, rule };
}

describe('WarehouseProfileChecklistService (B7)', () => {
  describe('AC1/AC2: produces an item per group with a stable code + status', () => {
    it('a healthy active Tier 1 profile passes the operational items and defers Epic-C/V1+ items', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);

      const dto = await harness.service.Verify(profile, At);

      expect(dto.ProfileId).toBe(profile.Id);
      expect(dto.WarehouseTypeCode).toBe('TIER_1');
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);

      // All ten required AC2 groups are present as items.
      const codes = dto.Items.map((item) => item.Code);
      expect(codes).toEqual(
        expect.arrayContaining([
          ProfileChecklistItemCode.ActiveProfile,
          ProfileChecklistItemCode.RuleGroup,
          ProfileChecklistItemCode.ControlMode,
          ProfileChecklistItemCode.PrecedenceConflict,
          ProfileChecklistItemCode.DefaultProfile,
          ProfileChecklistItemCode.OverrideReady,
          ProfileChecklistItemCode.AuditReady,
          ProfileChecklistItemCode.EffectiveVersion,
          ProfileChecklistItemCode.OwnerSegregation,
          ProfileChecklistItemCode.Compliance,
        ]),
      );

      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.RuleGroup).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ControlMode).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.PrecedenceConflict).Status).toBe(
        ProfileChecklistItemStatus.Pass,
      );
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.DefaultProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Pass);
    });

    it('every item exposes a non-empty Title and Message', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      for (const item of dto.Items) {
        expect(item.Title.length).toBeGreaterThan(0);
        expect(item.Message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('AC2 WP-ACTIVE: active profile presence', () => {
    it('fails when the target profile is not active', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      profile.Status = WarehouseProfileStatus.Draft;
      await harness.profiles.Create(profile);

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Fail);
    });

    it('fails when more than one active profile shares the scope (B5 invariant violated)', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      const sibling = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      // Same scope key, both active, overlapping windows -> invariant violation.
      sibling.ScopeKey = profile.ScopeKey;
      await harness.profiles.Create(profile);
      await harness.profiles.Create(sibling);

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Fail);
    });
  });

  describe('AC2/AC3 WP-RULE-GROUP: catalog state gating', () => {
    it('passes when bound rules belong to an ACTIVE catalog group', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.RuleGroup).Status).toBe(ProfileChecklistItemStatus.Pass);
    });

    it('warns when the active profile has no rule bound at all', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.RuleGroup).Status).toBe(ProfileChecklistItemStatus.Warning);
    });

    it('defers the placeholder-group portion to V1+ when a bound rule sits in a PLACEHOLDER group', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      await harness.groups.Create(PlaceholderGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);
      const placeholderRule = BuildRule({
        RuleCode: 'INB-1',
        RuleGroupId: PLACEHOLDER_GROUP_ID,
        WarehouseTypeCode: 'TIER_1',
      });
      await harness.definitions.Create(placeholderRule);
      await harness.bindings.Create(BuildBinding(profile.Id, placeholderRule.Id));

      const dto = await harness.service.Verify(profile, At);
      const item = ItemOf(dto.Items, ProfileChecklistItemCode.RuleGroup);
      expect(item.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(item.DeferredToStory).toBe('V1+');
    });
  });

  describe('AC2/AC3 WP-CONTROL-MODE: only passes when control mode is resolvable', () => {
    it('passes when the winner resolves a valid four-mode control mode', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ControlMode).Status).toBe(ProfileChecklistItemStatus.Pass);
    });

    it('warns when no rule resolves (no control mode data to confirm)', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);
      const dto = await harness.service.Verify(profile, At);
      // No winner -> no control-mode evidence -> not a Pass.
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ControlMode).Status).not.toBe(ProfileChecklistItemStatus.Pass);
    });
  });

  describe('AC2/AC4 WP-PRECEDENCE-CONFLICT: reads RulePreviewResult.Conflicts', () => {
    it('passes when no conflict is detected', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.PrecedenceConflict).Status).toBe(
        ProfileChecklistItemStatus.Pass,
      );
    });

    it('fails the conflict item (and only it among healthy ones) when two same-tier same-scope rules diverge', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);
      // Two Operation rules, same TIER_1 scope, divergent control mode -> a measured conflict.
      const ruleA = BuildRule({
        RuleCode: 'OP-A',
        RuleGroupId: ACTIVE_GROUP_ID,
        PrecedenceTier: RulePrecedenceTier.Operation,
        ControlMode: RuleControlMode.SoftWarning,
        WarehouseTypeCode: 'TIER_1',
        Priority: 10,
      });
      const ruleB = BuildRule({
        RuleCode: 'OP-B',
        RuleGroupId: ACTIVE_GROUP_ID,
        PrecedenceTier: RulePrecedenceTier.Operation,
        ControlMode: RuleControlMode.ApprovalRequired,
        WarehouseTypeCode: 'TIER_1',
        Priority: 20,
      });
      await harness.definitions.Create(ruleA);
      await harness.definitions.Create(ruleB);
      await harness.bindings.Create(BuildBinding(profile.Id, ruleA.Id));
      await harness.bindings.Create(BuildBinding(profile.Id, ruleB.Id));

      const dto = await harness.service.Verify(profile, At);
      const conflict = ItemOf(dto.Items, ProfileChecklistItemCode.PrecedenceConflict);
      expect(conflict.Status).toBe(ProfileChecklistItemStatus.Fail);
      expect(conflict.Evidence && conflict.Evidence.length).toBeGreaterThan(0);
      // No fail-spread: the active-profile item stays Pass.
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
    });
  });

  describe('AC2/AC4 WP-DEFAULT: fallback active profile for the warehouse type', () => {
    it('passes when an active fallback profile exists for the Tier 1 type', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.DefaultProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
    });

    it('fails when no active fallback profile exists for the type and does not spread to the version item', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      // The only profile of this type is DRAFT -> no active fallback for the type.
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      profile.Status = WarehouseProfileStatus.Draft;
      await harness.profiles.Create(profile);

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.DefaultProfile).Status).toBe(ProfileChecklistItemStatus.Fail);
      // Effective window is still valid for the DRAFT profile -> that item must NOT fail.
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Pass);
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
    });

    it('defers the system-default-seed sub-item to V1+', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      const seed = ItemOf(dto.Items, ProfileChecklistItemCode.DefaultSystemSeed);
      expect(seed.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(seed.DeferredToStory).toBe('V1+');
    });
  });

  describe('AC2 WP-EFFECTIVE-VERSION', () => {
    it('fails when the profile effective window has expired at EvaluatedAt', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      profile.EffectiveTo = new Date('2021-01-01T00:00:00.000Z'); // before At (2026)
      await harness.profiles.Create(profile);

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Fail);
    });

    it('fails when version is below 1', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1', Version: 0 });
      await harness.profiles.Create(profile);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Fail);
    });
  });

  describe('AC2 WP-COMPLIANCE: compliance hard block is legitimate, non-compliance hard block is misconfig', () => {
    it('passes when a Compliance hard block is the winner (handoff rule 11)', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);
      const compliance = BuildRule({
        RuleCode: 'COM-HB',
        RuleGroupId: ACTIVE_GROUP_ID,
        PrecedenceTier: RulePrecedenceTier.Compliance,
        ControlMode: RuleControlMode.HardBlock,
        WarehouseTypeCode: 'TIER_1',
      });
      await harness.definitions.Create(compliance);
      await harness.bindings.Create(BuildBinding(profile.Id, compliance.Id));

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.Compliance).Status).toBe(ProfileChecklistItemStatus.Pass);
    });

    it('fails when a NON-compliance hard block is the self-context winner (B5 misconfig definition)', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      await harness.profiles.Create(profile);
      const operationHardBlock = BuildRule({
        RuleCode: 'OP-HB',
        RuleGroupId: ACTIVE_GROUP_ID,
        PrecedenceTier: RulePrecedenceTier.Operation,
        ControlMode: RuleControlMode.HardBlock,
        WarehouseTypeCode: 'TIER_1',
      });
      await harness.definitions.Create(operationHardBlock);
      await harness.bindings.Create(BuildBinding(profile.Id, operationHardBlock.Id));

      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.Compliance).Status).toBe(ProfileChecklistItemStatus.Fail);
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
    });
  });

  describe('AC2 WP-OWNER-SEGREGATION', () => {
    it('passes when the profile/rule owner scope is consistent', async () => {
      const harness = NewHarness();
      const ownerId = randomUUID();
      const { profile } = await SeedHealthyProfile(harness, ownerId);
      const dto = await harness.service.Verify(profile, At);
      expect(ItemOf(dto.Items, ProfileChecklistItemCode.OwnerSegregation).Status).toBe(ProfileChecklistItemStatus.Pass);
    });
  });

  describe('AC2/AC3 WP-OVERRIDE-READY + WP-AUDIT-READY: read flags, defer execution', () => {
    it('reads override-readiness flags and defers override execution to C6/C7', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);

      const ready = ItemOf(dto.Items, ProfileChecklistItemCode.OverrideReady);
      expect([ProfileChecklistItemStatus.Pass, ProfileChecklistItemStatus.Warning]).toContain(ready.Status);

      const exec = ItemOf(dto.Items, ProfileChecklistItemCode.OverrideExecution);
      expect(exec.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(exec.DeferredToStory).toBe('C6/C7');
    });

    it('defers immutable audit to C4/C5 and reason-code catalog to C3', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);

      const immutable = ItemOf(dto.Items, ProfileChecklistItemCode.AuditImmutable);
      expect(immutable.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(immutable.DeferredToStory).toBe('C4/C5');

      const reasonCatalog = ItemOf(dto.Items, ProfileChecklistItemCode.AuditReasonCatalog);
      expect(reasonCatalog.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(reasonCatalog.DeferredToStory).toBe('C3');
    });
  });

  describe('AC3: every Deferred item names a concrete DeferredToStory; no vague defer', () => {
    it('defers RBAC readiness to C1/C2 and never leaves a Deferred item without a story', async () => {
      const harness = NewHarness();
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);

      const rbac = ItemOf(dto.Items, ProfileChecklistItemCode.RbacReady);
      expect(rbac.Status).toBe(ProfileChecklistItemStatus.Deferred);
      expect(rbac.DeferredToStory).toBe('C1/C2');

      const deferred = dto.Items.filter((item) => item.Status === ProfileChecklistItemStatus.Deferred);
      expect(deferred.length).toBeGreaterThan(0);
      for (const item of deferred) {
        expect(typeof item.DeferredToStory).toBe('string');
        expect((item.DeferredToStory ?? '').length).toBeGreaterThan(0);
      }
    });
  });

  describe('AC4: Fail/Warning are data, never thrown; OverallStatus driven only by Fail', () => {
    it('does not throw for a profile that fails several items', async () => {
      const harness = NewHarness();
      await harness.groups.Create(ActiveGroup());
      const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
      profile.Status = WarehouseProfileStatus.Draft;
      profile.EffectiveTo = new Date('2021-01-01T00:00:00.000Z');
      await harness.profiles.Create(profile);

      const dto = await harness.service.Verify(profile, At);
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
      // Multiple Fails coexist without exception or fail-spread to deferred items.
      expect(dto.Items.some((item) => item.Status === ProfileChecklistItemStatus.Deferred)).toBe(true);
    });

    it('OverallStatus is Pass when only Warning/Deferred items are present (no Fail)', async () => {
      const harness = NewHarness();
      // A healthy active profile produces only Pass/Warning/Deferred items and no Fail.
      const { profile } = await SeedHealthyProfile(harness);
      const dto = await harness.service.Verify(profile, At);
      expect(dto.Items.some((item) => item.Status === ProfileChecklistItemStatus.Fail)).toBe(false);
      expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
    });
  });
});
