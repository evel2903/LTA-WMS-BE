import { NotFoundException } from '@common/Exceptions/AppException';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';
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
import { InMemoryWarehouseProfileRepository } from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import {
  BuildBinding,
  BuildProfile,
  BuildRule,
  At,
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const ACTIVE_GROUP_ID = 'group-active';

function Harness() {
  const profiles = new InMemoryWarehouseProfileRepository();
  const groups = new InMemoryRuleGroupRepository();
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
  const service = new WarehouseProfileChecklistService(profiles, groups, definitions, bindings, preview);
  const useCase = new VerifyWarehouseProfileChecklistUseCase(profiles, resolver, service);
  return { profiles, groups, definitions, bindings, service, useCase };
}

async function SeedActive(harness: ReturnType<typeof Harness>) {
  await harness.groups.Create(
    new RuleGroupEntity({
      Id: ACTIVE_GROUP_ID,
      GroupCode: 'R-COM',
      GroupName: 'Compliance',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: At,
      UpdatedAt: At,
    }),
  );
  const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
  await harness.profiles.Create(profile);
  const rule = BuildRule({
    RuleCode: 'OP-OK',
    RuleGroupId: ACTIVE_GROUP_ID,
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
  });
  await harness.definitions.Create(rule);
  await harness.bindings.Create(BuildBinding(profile.Id, rule.Id));
  return profile;
}

describe('VerifyWarehouseProfileChecklistUseCase (B7)', () => {
  it('AC1/AC5: Execute by ProfileId returns the DTO for that profile', async () => {
    const harness = Harness();
    const profile = await SeedActive(harness);

    const dto = await harness.useCase.Execute({ ProfileId: profile.Id, EvaluatedAt: At });

    expect(dto.ProfileId).toBe(profile.Id);
    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
  });

  it('AC1: Execute by ProfileId throws NotFoundException when the profile is absent', async () => {
    const harness = Harness();
    await expect(harness.useCase.Execute({ ProfileId: 'missing', EvaluatedAt: At })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('AC5: Execute by WarehouseTypeCode resolves the active profile for the Tier 1 type', async () => {
    const harness = Harness();
    const profile = await SeedActive(harness);

    const dto = await harness.useCase.Execute({ WarehouseTypeCode: 'TIER_1', EvaluatedAt: At });

    expect(dto.ProfileId).toBe(profile.Id);
    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
  });

  it('AC4: Execute by WarehouseTypeCode fails the WP-DEFAULT item when no active profile resolves for the type', async () => {
    const harness = Harness();
    // A DRAFT-only profile of this type means the resolver finds no active fallback.
    await harness.groups.Create(
      new RuleGroupEntity({
        Id: ACTIVE_GROUP_ID,
        GroupCode: 'R-COM',
        GroupName: 'Compliance',
        CatalogState: RuleGroupCatalogState.Active,
        CreatedAt: At,
        UpdatedAt: At,
      }),
    );
    const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
    profile.Status = WarehouseProfileStatus.Draft;
    await harness.profiles.Create(profile);

    const dto = await harness.useCase.Execute({ WarehouseTypeCode: 'TIER_1', EvaluatedAt: At });

    const defaultItem = dto.Items.find((item) => item.Code === ProfileChecklistItemCode.DefaultProfile);
    expect(defaultItem?.Status).toBe(ProfileChecklistItemStatus.Fail);
    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
  });

  it('AC1: requires either a ProfileId or a WarehouseTypeCode to identify the target', async () => {
    const harness = Harness();
    await expect(harness.useCase.Execute({ EvaluatedAt: At })).rejects.toBeTruthy();
  });
});
