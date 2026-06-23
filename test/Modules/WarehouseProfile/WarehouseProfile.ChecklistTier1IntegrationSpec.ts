import { randomUUID } from 'crypto';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';
import { WarehouseProfileChecklistService } from '@modules/WarehouseProfile/Application/Services/WarehouseProfileChecklistService';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';
import { ProfileChecklistItemCode } from '@modules/WarehouseProfile/Domain/Constants/ProfileChecklistItemCode';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { WarehouseProfileChecklistItemDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileChecklistDto';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
  StubRuleResolver,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

class MemorySiteRepository implements ISiteRepository {
  private readonly sites = new Map<string, SiteEntity>();
  public async FindById(id: string): Promise<SiteEntity | null> {
    return this.sites.get(id) ?? null;
  }
  public async FindByCode(code: string): Promise<SiteEntity | null> {
    return [...this.sites.values()].find((site) => site.SiteCode === code) ?? null;
  }
  public async Create(site: SiteEntity): Promise<SiteEntity> {
    this.sites.set(site.Id, site);
    return site;
  }
  public async Update(site: SiteEntity): Promise<SiteEntity> {
    this.sites.set(site.Id, site);
    return site;
  }
  public async List(): Promise<{ Items: SiteEntity[]; TotalItems: number }> {
    const items = [...this.sites.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryWarehouseRepository implements IWarehouseRepository {
  private readonly warehouses = new Map<string, WarehouseEntity>();
  public async FindById(id: string): Promise<WarehouseEntity | null> {
    return this.warehouses.get(id) ?? null;
  }
  public async FindByCode(code: string): Promise<WarehouseEntity | null> {
    return [...this.warehouses.values()].find((w) => w.WarehouseCode === code) ?? null;
  }
  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }
  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }
  public async List(): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    const items = [...this.warehouses.values()];
    return { Items: items, TotalItems: items.length };
  }
}

const At = new Date('2026-06-01T00:00:00.000Z');

function ItemOf(items: WarehouseProfileChecklistItemDto[], code: string): WarehouseProfileChecklistItemDto {
  const item = items.find((candidate) => candidate.Code === code);
  if (!item) {
    throw new Error(`Expected checklist item ${code}`);
  }
  return item;
}

/**
 * B7 AC2/AC4/AC5 over a genuine Site -> Tier 1 Warehouse -> Profile -> bound rule fixture, with the
 * real B3 resolver + B4 preview wired over the same in-memory repos. The checklist use case is the
 * stable C10/C12 re-use point.
 */
describe('B7 Tier 1 checklist integration (real resolver + preview, no DB)', () => {
  async function BuildWorld() {
    const sites = new MemorySiteRepository();
    const warehouses = new MemoryWarehouseRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const groups = new InMemoryRuleGroupRepository();
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();

    const scopeKeyService = new ScopeKeyService();
    const policyValidator = new WarehouseProfilePolicyValidator();

    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
    const checklistService = new WarehouseProfileChecklistService(profiles, groups, definitions, bindings, preview);
    const checklistUseCase = new VerifyWarehouseProfileChecklistUseCase(profiles, resolver, checklistService);

    // Activation gate uses a clean preview so activation is not blocked by its own self-check; the
    // checklist itself reads the genuine resolver/preview.
    const cleanWinner = BuildRule({
      RuleCode: 'OP-CLEAN',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    const cleanPreview = new PreviewRuleResolutionUseCase(
      new StubRuleResolver({
        Winner: cleanWinner,
        Allowed: true,
        ApprovalRequired: false,
        OrderedCandidates: [cleanWinner],
        EffectivePriorities: { [cleanWinner.Id]: cleanWinner.Priority },
        ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
      }),
      new RuleConflictDetector(),
    );
    const guard = new ProfileActivationGuard(profiles, cleanPreview);
    const activate = new ActivateWarehouseProfileUseCase(profiles, policyValidator, guard);
    const addRule = new AddWarehouseProfileRuleUseCase(bindings, profiles, definitions);

    const site = await new CreateSiteUseCase(sites).Execute({
      SiteCode: `SITE-${randomUUID().slice(0, 8)}`,
      SiteName: 'Tier 1 Site',
      Status: MasterDataStatus.Active,
    });
    await new CreateWarehouseUseCase(warehouses, sites).Execute({
      SiteId: site.Id,
      WarehouseCode: `WH-${randomUUID().slice(0, 8)}`,
      WarehouseName: 'Tier 1 Warehouse',
      WarehouseTypeCode: 'TIER_1',
      Status: MasterDataStatus.Active,
    });

    const createProfile = new CreateWarehouseProfileUseCase(
      profiles,
      warehouses,
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      scopeKeyService,
      policyValidator,
    );

    const activeGroup = new RuleGroupEntity({
      Id: 'group-active',
      GroupCode: 'R-COM',
      GroupName: 'Compliance group',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: At,
      UpdatedAt: At,
    });
    await groups.Create(activeGroup);

    return { profiles, groups, definitions, bindings, createProfile, activate, addRule, checklistUseCase };
  }

  it('AC2/AC5: a fully-configured active Tier 1 profile passes overall via the use case', async () => {
    const world = await BuildWorld();
    const profile = await world.createProfile.Execute({
      ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Tier 1 Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });
    const rule = BuildRule({
      RuleCode: 'TIER1-OP',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    await world.definitions.Create(rule);
    await world.addRule.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: rule.Id });
    await world.activate.Execute({ Id: profile.Id, ActorUserId: 'admin-1', ReasonCode: 'GO_LIVE' });

    const dto = await world.checklistUseCase.Execute({ ProfileId: profile.Id, EvaluatedAt: At });

    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.DefaultProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.PrecedenceConflict).Status).toBe(ProfileChecklistItemStatus.Pass);
  });

  it('AC4: a draft profile (no active fallback for the type) fails WP-DEFAULT but not the version item', async () => {
    const world = await BuildWorld();
    const profile = await world.createProfile.Execute({
      ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Draft Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });
    // Not activated -> stays DRAFT.

    const dto = await world.checklistUseCase.Execute({ ProfileId: profile.Id, EvaluatedAt: At });

    expect(ItemOf(dto.Items, ProfileChecklistItemCode.DefaultProfile).Status).toBe(ProfileChecklistItemStatus.Fail);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Pass);
    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
  });

  it('AC4: two same-tier same-scope divergent rules fail WP-PRECEDENCE-CONFLICT only', async () => {
    const world = await BuildWorld();
    const profile = await world.createProfile.Execute({
      ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Conflicting Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });
    const ruleA = BuildRule({
      RuleCode: 'OP-A',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      Priority: 10,
    });
    const ruleB = BuildRule({
      RuleCode: 'OP-B',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      Priority: 20,
    });
    await world.definitions.Create(ruleA);
    await world.definitions.Create(ruleB);
    await world.addRule.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: ruleA.Id });
    await world.addRule.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: ruleB.Id });
    await world.activate.Execute({ Id: profile.Id, ActorUserId: 'admin-1', ReasonCode: 'GO_LIVE' });

    const dto = await world.checklistUseCase.Execute({ ProfileId: profile.Id, EvaluatedAt: At });

    expect(ItemOf(dto.Items, ProfileChecklistItemCode.PrecedenceConflict).Status).toBe(ProfileChecklistItemStatus.Fail);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.ActiveProfile).Status).toBe(ProfileChecklistItemStatus.Pass);
    expect(ItemOf(dto.Items, ProfileChecklistItemCode.EffectiveVersion).Status).toBe(ProfileChecklistItemStatus.Pass);
    expect(dto.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
  });
});
