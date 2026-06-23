import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { ListWarehouseProfileRulesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileRulesUseCase';
import { RemoveWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/RemoveWarehouseProfileRuleUseCase';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

const Now = new Date('2026-01-01T00:00:00.000Z');

const DraftProfile = (id: string): WarehouseProfileEntity =>
  new WarehouseProfileEntity({
    Id: id,
    ProfileCode: `WP-${id}`,
    ProfileName: 'Draft profile',
    WarehouseTypeCode: 'TIER_1',
    Version: 1,
    Status: WarehouseProfileStatus.Draft,
    ScopeKey: 'scope-1',
    EffectiveFrom: Now,
    CreatedAt: Now,
    UpdatedAt: Now,
  });

const Rule = (id: string): RuleDefinitionEntity =>
  new RuleDefinitionEntity({
    Id: id,
    RuleCode: `RULE-${id}`,
    RuleName: 'Rule',
    RuleGroupId: randomUUID(),
    PrecedenceTier: RulePrecedenceTier.Compliance,
    ControlMode: RuleControlMode.HardBlock,
    Status: RuleStatus.Active,
    ScopeKey: 'scope-1',
    EffectiveFrom: Now,
    Priority: 100,
    ConditionJson: {},
    ActionJson: {},
    CreatedAt: Now,
    UpdatedAt: Now,
  });

const Setup = async () => {
  const profiles = new InMemoryWarehouseProfileRepository();
  const defs = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profile = DraftProfile('profile-1');
  await profiles.Create(profile);
  const rule = Rule('rule-1');
  await defs.Create(rule);
  return { profiles, defs, bindings, profile, rule };
};

describe('Warehouse profile rule binding use cases', () => {
  it('binds a rule into a draft profile and reads it back with IsEnabled and OverridePriority', async () => {
    const { profiles, defs, bindings, profile, rule } = await Setup();

    const created = await new AddWarehouseProfileRuleUseCase(bindings, profiles, defs).Execute({
      WarehouseProfileId: profile.Id,
      RuleDefinitionId: rule.Id,
      IsEnabled: true,
      OverridePriority: 5,
    });

    expect(created.WarehouseProfileId).toBe(profile.Id);
    expect(created.RuleDefinitionId).toBe(rule.Id);
    expect(created.IsEnabled).toBe(true);
    expect(created.OverridePriority).toBe(5);

    const listed = await new ListWarehouseProfileRulesUseCase(bindings, profiles).Execute(profile.Id, {});
    expect(listed.Items).toHaveLength(1);
    expect(listed.Items[0].OverridePriority).toBe(5);
    expect(listed.Items[0].IsEnabled).toBe(true);
  });

  it('defaults IsEnabled to true and OverridePriority to null', async () => {
    const { profiles, defs, bindings, profile, rule } = await Setup();

    const created = await new AddWarehouseProfileRuleUseCase(bindings, profiles, defs).Execute({
      WarehouseProfileId: profile.Id,
      RuleDefinitionId: rule.Id,
    });

    expect(created.IsEnabled).toBe(true);
    expect(created.OverridePriority).toBeNull();
  });

  it('throws NotFoundException when the profile does not exist', async () => {
    const { defs, bindings, profiles, rule } = await Setup();

    await expect(
      new AddWarehouseProfileRuleUseCase(bindings, profiles, defs).Execute({
        WarehouseProfileId: 'missing',
        RuleDefinitionId: rule.Id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the rule definition does not exist', async () => {
    const { defs, bindings, profiles, profile } = await Setup();

    await expect(
      new AddWarehouseProfileRuleUseCase(bindings, profiles, defs).Execute({
        WarehouseProfileId: profile.Id,
        RuleDefinitionId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when binding the same rule twice into one profile', async () => {
    const { profiles, defs, bindings, profile, rule } = await Setup();
    const useCase = new AddWarehouseProfileRuleUseCase(bindings, profiles, defs);

    await useCase.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: rule.Id });
    await expect(useCase.Execute({ WarehouseProfileId: profile.Id, RuleDefinitionId: rule.Id })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('removes a binding without affecting the rule definition', async () => {
    const { profiles, defs, bindings, profile, rule } = await Setup();
    const created = await new AddWarehouseProfileRuleUseCase(bindings, profiles, defs).Execute({
      WarehouseProfileId: profile.Id,
      RuleDefinitionId: rule.Id,
    });

    await new RemoveWarehouseProfileRuleUseCase(bindings, profiles).Execute(profile.Id, created.Id);

    const listed = await new ListWarehouseProfileRulesUseCase(bindings, profiles).Execute(profile.Id, {});
    expect(listed.Items).toHaveLength(0);
    // rule definition still present
    expect(await defs.FindById(rule.Id)).not.toBeNull();
  });

  it('throws NotFoundException when removing a missing binding', async () => {
    const { profiles, bindings, profile } = await Setup();

    await expect(
      new RemoveWarehouseProfileRuleUseCase(bindings, profiles).Execute(profile.Id, 'missing-binding'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
