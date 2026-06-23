import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { CreateRuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/CreateRuleDefinitionDto';
import { RulePayloadValidator } from '@modules/WarehouseProfile/Application/Services/RulePayloadValidator';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { CreateRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleDefinitionUseCase';
import { GetRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleDefinitionUseCase';
import { ListRuleDefinitionsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleDefinitionsUseCase';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { MasterDataReferenceStub } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

const Now = new Date('2026-01-01T00:00:00.000Z');

const SeedGroup = async (groups: InMemoryRuleGroupRepository, code = 'R-COM'): Promise<string> => {
  const id = randomUUID();
  await groups.Create(
    new RuleGroupEntity({
      Id: id,
      GroupCode: code,
      GroupName: code,
      Description: null,
      CatalogState: RuleGroupCatalogState.Active,
      DisplayOrder: null,
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: Now,
      UpdatedAt: Now,
      CreatedBy: null,
      UpdatedBy: null,
    }),
  );
  return id;
};

const BuildUseCase = (
  defs: InMemoryRuleDefinitionRepository,
  groups: InMemoryRuleGroupRepository,
  refs: MasterDataReferenceStub,
) =>
  new CreateRuleDefinitionUseCase(
    defs,
    groups,
    refs.Warehouses,
    refs.Zones,
    refs.Owners,
    refs.Skus,
    new ScopeKeyService(),
    new RulePayloadValidator(),
  );

const BaseDto = (groupId: string, overrides: Partial<CreateRuleDefinitionDto> = {}): CreateRuleDefinitionDto => ({
  RuleCode: `RULE-${randomUUID().slice(0, 8)}`,
  RuleName: 'Sample rule',
  RuleGroupId: groupId,
  PrecedenceTier: 'COMPLIANCE',
  ControlMode: 'HARD_BLOCK',
  Status: 'ACTIVE',
  WarehouseTypeCode: 'TIER_1',
  EffectiveFrom: '2026-01-01',
  ...overrides,
});

describe('Rule definition use cases', () => {
  it('creates a rule definition and persists tier, control mode, scope_key and lifecycle flags', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    const created = await BuildUseCase(defs, groups, refs).Execute(
      BaseDto(groupId, {
        ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'OwnerId', Comparator: 'EQ', Value: 'x' }] },
        ActionJson: { Type: 'BLOCK' },
        Priority: 50,
        RequiresReason: true,
        RequiresEvidence: true,
        AllowOverride: false,
      }),
    );

    expect(created.PrecedenceTier).toBe(RulePrecedenceTier.Compliance);
    expect(created.ControlMode).toBe(RuleControlMode.HardBlock);
    expect(created.Status).toBe(RuleStatus.Active);
    expect(created.Priority).toBe(50);
    expect(created.RequiresReason).toBe(true);
    expect(created.RequiresEvidence).toBe(true);
    expect(created.AllowOverride).toBe(false);
    expect(typeof created.ScopeKey).toBe('string');
    expect(created.ScopeKey.length).toBeGreaterThan(0);
  });

  it('defaults priority to 100, status to ACTIVE and lifecycle flags to false when omitted', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    const created = await BuildUseCase(defs, groups, refs).Execute(
      BaseDto(groupId, { Status: undefined, Priority: undefined }),
    );

    expect(created.Priority).toBe(100);
    expect(created.Status).toBe(RuleStatus.Active);
    expect(created.RequiresReason).toBe(false);
    expect(created.RequiresEvidence).toBe(false);
    expect(created.AllowOverride).toBe(false);
    expect(created.ConditionJson).toEqual({});
    expect(created.ActionJson).toEqual({});
  });

  it('builds the same scope_key for the same scope and a different key for a different axis', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    refs.AddWarehouse('wh-1', MasterDataStatus.Active);
    const groupId = await SeedGroup(groups);
    const useCase = BuildUseCase(defs, groups, refs);

    const a = await useCase.Execute(BaseDto(groupId, { WarehouseTypeCode: 'TIER_1' }));
    const b = await useCase.Execute(BaseDto(groupId, { WarehouseTypeCode: 'TIER_1' }));
    const c = await useCase.Execute(BaseDto(groupId, { WarehouseTypeCode: 'TIER_1', WarehouseId: 'wh-1' }));

    expect(a.ScopeKey).toBe(b.ScopeKey);
    expect(a.ScopeKey).not.toBe(c.ScopeKey);
  });

  it('throws NotFoundException when the rule group does not exist', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();

    await expect(BuildUseCase(defs, groups, refs).Execute(BaseDto('missing-group'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException on a duplicate rule code pre-check', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);
    const useCase = BuildUseCase(defs, groups, refs);

    await useCase.Execute(BaseDto(groupId, { RuleCode: 'RULE-DUP' }));
    await expect(useCase.Execute(BaseDto(groupId, { RuleCode: 'RULE-DUP' }))).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when a non-null warehouse scope reference is missing', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    await expect(
      BuildUseCase(defs, groups, refs).Execute(BaseDto(groupId, { WarehouseId: 'wh-missing' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException when a non-null scope reference is inactive', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    refs.AddOwner('owner-inactive', MasterDataStatus.Inactive);
    const groupId = await SeedGroup(groups);

    await expect(
      BuildUseCase(defs, groups, refs).Execute(BaseDto(groupId, { OwnerId: 'owner-inactive' })),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws BusinessRuleException for a malformed condition payload', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    await expect(
      BuildUseCase(defs, groups, refs).Execute(
        BaseDto(groupId, { ConditionJson: { Operator: 'NOPE', Predicates: [] } }),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws BusinessRuleException for an unknown precedence tier', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    await expect(
      BuildUseCase(defs, groups, refs).Execute(BaseDto(groupId, { PrecedenceTier: 'WHATEVER' })),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws BusinessRuleException when EffectiveTo is not after EffectiveFrom', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    await expect(
      BuildUseCase(defs, groups, refs).Execute(
        BaseDto(groupId, { EffectiveFrom: '2026-02-01', EffectiveTo: '2026-01-01' }),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('gets a rule definition by id and throws NotFoundException when absent', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);

    const created = await BuildUseCase(defs, groups, refs).Execute(BaseDto(groupId));
    const fetched = await new GetRuleDefinitionUseCase(defs).Execute(created.Id);
    expect(fetched.RuleCode).toBe(created.RuleCode);

    await expect(new GetRuleDefinitionUseCase(defs).Execute('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists rule definitions filtered by precedence tier', async () => {
    const defs = new InMemoryRuleDefinitionRepository();
    const groups = new InMemoryRuleGroupRepository();
    const refs = new MasterDataReferenceStub();
    const groupId = await SeedGroup(groups);
    const useCase = BuildUseCase(defs, groups, refs);

    await useCase.Execute(BaseDto(groupId, { PrecedenceTier: 'COMPLIANCE' }));
    await useCase.Execute(BaseDto(groupId, { PrecedenceTier: 'PHYSICAL' }));

    const filtered = await new ListRuleDefinitionsUseCase(defs).Execute({
      PrecedenceTier: RulePrecedenceTier.Physical,
    });
    expect(filtered.Items).toHaveLength(1);
    expect(filtered.Items[0].PrecedenceTier).toBe(RulePrecedenceTier.Physical);
  });
});
