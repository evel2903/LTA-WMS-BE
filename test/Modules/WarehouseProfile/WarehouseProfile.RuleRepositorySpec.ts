import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleDefinitionRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleDefinitionRepository';
import { WarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRuleRepository';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });
const Now = new Date('2026-01-01T00:00:00.000Z');

const Group = () =>
  new RuleGroupEntity({
    Id: randomUUID(),
    GroupCode: 'R-MD',
    GroupName: 'Master Data',
    Description: null,
    CatalogState: RuleGroupCatalogState.Active,
    DisplayOrder: null,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: Now,
    UpdatedAt: Now,
    CreatedBy: null,
    UpdatedBy: null,
  });

const Definition = () =>
  new RuleDefinitionEntity({
    Id: randomUUID(),
    RuleCode: 'RULE-1',
    RuleName: 'Rule 1',
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

const Binding = () =>
  new WarehouseProfileRuleEntity({
    Id: randomUUID(),
    WarehouseProfileId: randomUUID(),
    RuleDefinitionId: randomUUID(),
    IsEnabled: true,
    OverridePriority: null,
    CreatedAt: Now,
    UpdatedAt: Now,
  });

describe('Rule repositories map DB unique violation 23505 to ConflictException', () => {
  it('rule group repository on create', async () => {
    const repository = new RuleGroupRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<RuleGroupOrmEntity>);

    await expect(repository.Create(Group())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rule definition repository on create', async () => {
    const repository = new RuleDefinitionRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<RuleDefinitionOrmEntity>);

    await expect(repository.Create(Definition())).rejects.toBeInstanceOf(ConflictException);
  });

  it('warehouse profile rule repository on create', async () => {
    const repository = new WarehouseProfileRuleRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseProfileRuleOrmEntity>);

    await expect(repository.Create(Binding())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-unique-violation errors unchanged', async () => {
    const original = new Error('connection lost');
    const repository = new RuleGroupRepository({
      save: jest.fn().mockRejectedValue(original),
    } as unknown as Repository<RuleGroupOrmEntity>);

    await expect(repository.Create(Group())).rejects.toBe(original);
  });
});
