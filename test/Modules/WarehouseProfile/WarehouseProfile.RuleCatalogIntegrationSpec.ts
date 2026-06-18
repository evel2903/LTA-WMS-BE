import { randomUUID } from 'crypto';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { CreateRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleGroupUseCase';
import { CreateRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleDefinitionUseCase';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { ListWarehouseProfileRulesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileRulesUseCase';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { RulePayloadValidator } from '@modules/WarehouseProfile/Application/Services/RulePayloadValidator';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { CreateRuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/CreateRuleDefinitionDto';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import {
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';

describe('Rule catalog integration (B2 catalog + definition + binding only)', () => {
  it('creates rules across 3 precedence tiers and 4 distinct scopes, then binds into a draft profile', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const defs = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const refs = new MasterDataReferenceStub();

    refs.AddWarehouse('wh-1', MasterDataStatus.Active);
    refs.AddOwner('owner-1', MasterDataStatus.Active);
    refs.AddSku('sku-1', true);

    const group = await new CreateRuleGroupUseCase(groups).Execute({ GroupCode: 'R-COM', GroupName: 'Compliance' });

    const createRule = new CreateRuleDefinitionUseCase(
      defs,
      groups,
      refs.Warehouses,
      refs.Zones,
      refs.Owners,
      refs.Skus,
      new ScopeKeyService(),
      new RulePayloadValidator(),
    );

    const base = (overrides: Partial<CreateRuleDefinitionDto>): CreateRuleDefinitionDto => ({
      RuleCode: `RULE-${randomUUID().slice(0, 8)}`,
      RuleName: 'Rule',
      RuleGroupId: group.Id,
      PrecedenceTier: 'COMPLIANCE',
      ControlMode: 'HARD_BLOCK',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
      ...overrides,
    });

    // Scope 1: warehouse type only, COMPLIANCE
    const r1 = await createRule.Execute(base({ PrecedenceTier: 'COMPLIANCE', WarehouseTypeCode: 'TIER_1' }));
    // Scope 2: specific warehouse, PHYSICAL
    const r2 = await createRule.Execute(
      base({ PrecedenceTier: 'PHYSICAL', ControlMode: 'SOFT_WARNING', WarehouseId: 'wh-1' }),
    );
    // Scope 3: owner, OWNER_CONTRACT
    const r3 = await createRule.Execute(
      base({ PrecedenceTier: 'OWNER_CONTRACT', ControlMode: 'APPROVAL_REQUIRED', OwnerId: 'owner-1' }),
    );
    // Scope 4: SKU + order context, OPTIMIZATION
    const r4 = await createRule.Execute(
      base({
        PrecedenceTier: 'OPTIMIZATION',
        ControlMode: 'AUTO_SUGGESTION',
        SkuId: 'sku-1',
        OrderType: 'B2C',
      }),
    );

    // >= 3 distinct precedence tiers
    const tiers = new Set([r1.PrecedenceTier, r2.PrecedenceTier, r3.PrecedenceTier, r4.PrecedenceTier]);
    expect(tiers.size).toBeGreaterThanOrEqual(3);

    // >= 4 distinct scope keys
    const scopeKeys = new Set([r1.ScopeKey, r2.ScopeKey, r3.ScopeKey, r4.ScopeKey]);
    expect(scopeKeys.size).toBe(4);

    // Create a DRAFT profile via B1 use case
    const profile = await new CreateWarehouseProfileUseCase(
      profiles,
      refs.Warehouses,
      refs.Zones,
      refs.Owners,
      refs.Skus,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
    ).Execute({
      ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Draft profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });
    expect(profile.Status).toBe(WarehouseProfileStatus.Draft);

    // Bind the four rules into the draft profile
    const addBinding = new AddWarehouseProfileRuleUseCase(bindings, profiles, defs);
    await addBinding.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: r1.Id });
    await addBinding.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: r2.Id, OverridePriority: 10 });
    await addBinding.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: r3.Id });
    await addBinding.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: r4.Id });

    const listed = await new ListWarehouseProfileRulesUseCase(bindings, profiles).Execute(profile.Id, {});
    expect(listed.Items).toHaveLength(4);
    const r2Binding = listed.Items.find((b) => b.RuleDefinitionId === r2.Id);
    expect(r2Binding?.OverridePriority).toBe(10);
    expect(r2Binding?.IsEnabled).toBe(true);
  });
});
