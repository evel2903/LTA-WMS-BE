import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
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
  StubRuleResolver,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { BuildBinding, BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

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

describe('AC5/AC3 integration: exactly one active profile per scope for Warehouse Tier 1', () => {
  it('activates profile #1, blocks overlapping #2, and the resolver selects the active profile; deactivating #1 frees #2', async () => {
    const sites = new MemorySiteRepository();
    const warehouses = new MemoryWarehouseRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const groups = new InMemoryRuleGroupRepository();
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();

    const scopeKeyService = new ScopeKeyService();
    const policyValidator = new WarehouseProfilePolicyValidator();

    // Real B3 resolver wired over the same in-memory repos so AC3 selection is genuine.
    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    // The activation gate uses a separate clean preview (a single non-blocking Operation rule) so the
    // gate passes; AC5/AC3 are about overlap + resolver selection, not the conflict gate (covered elsewhere).
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
    const deactivate = new DeactivateWarehouseProfileUseCase(profiles);

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
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      scopeKeyService,
      policyValidator,
    );

    // Two DRAFT profiles, same TIER_1 scope, overlapping windows (both open-ended from 2026-01-01).
    const p1 = await createProfile.Execute({
      ProfileCode: `WP-1-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Tier 1 Profile #1',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });
    const p2 = await createProfile.Execute({
      ProfileCode: `WP-2-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Tier 1 Profile #2',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    // Give the resolver a real winning rule belonging to BOTH profiles (an active group + binding).
    const activeGroup = new RuleGroupEntity({
      Id: 'group-active',
      GroupCode: 'GRP-ACTIVE',
      GroupName: 'Active group',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: At,
      UpdatedAt: At,
    });
    await groups.Create(activeGroup);
    const tierRule = BuildRule({
      RuleCode: 'TIER1-OP',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    await definitions.Create(tierRule);
    await bindings.Create(BuildBinding(p1.Id, tierRule.Id));
    await bindings.Create(BuildBinding(p2.Id, tierRule.Id));

    // Activate #1 -> success.
    const activated1 = await activate.Execute({ Id: p1.Id, ActorUserId: 'admin-1', ReasonCode: 'GO_LIVE' });
    expect(activated1.Status).toBe(WarehouseProfileStatus.Active);

    // Activate #2 (overlapping same scope/window) -> blocked.
    await expect(activate.Execute({ Id: p2.Id })).rejects.toBeInstanceOf(ConflictException);

    // At the effective time, exactly ONE active profile exists for the Tier 1 scope.
    const activeNow = await profiles.ListActiveByScope(At);
    expect(activeNow).toHaveLength(1);
    expect(activeNow[0].Id).toBe(p1.Id);

    // AC3: the resolver selects the activated profile's rule.
    const decision = await resolver.Resolve({ WarehouseTypeCode: 'TIER_1', EvaluatedAt: At });
    expect(decision.Winner?.RuleCode).toBe('TIER1-OP');

    // Deactivate #1 -> RETIRED; now NO active profile for the scope.
    const deactivated1 = await deactivate.Execute({ Id: p1.Id, ActorUserId: 'admin-1', ReasonCode: 'RETIRE' });
    expect(deactivated1.Status).toBe(WarehouseProfileStatus.Retired);
    expect(await profiles.ListActiveByScope(At)).toHaveLength(0);

    // Now #2 can be activated (no overlapping active profile).
    const activated2 = await activate.Execute({ Id: p2.Id, ActorUserId: 'admin-1', ReasonCode: 'GO_LIVE' });
    expect(activated2.Status).toBe(WarehouseProfileStatus.Active);

    const afterReactivate = await profiles.ListActiveByScope(At);
    expect(afterReactivate).toHaveLength(1);
    expect(afterReactivate[0].Id).toBe(p2.Id);
  });
});
