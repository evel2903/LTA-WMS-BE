import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleGroupUseCase';
import { GetRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleGroupUseCase';
import { ListRuleGroupsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleGroupsUseCase';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { InMemoryRuleGroupRepository } from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';

describe('Rule group use cases', () => {
  it('creates a rule group with an ACTIVE catalog state', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const created = await new CreateRuleGroupUseCase(groups).Execute({
      GroupCode: 'R-MD',
      GroupName: 'Master Data Rules',
      CatalogState: RuleGroupCatalogState.Active,
    });

    expect(created.Id).toBeDefined();
    expect(created.GroupCode).toBe('R-MD');
    expect(created.CatalogState).toBe(RuleGroupCatalogState.Active);
  });

  it('defaults catalog state to ACTIVE when omitted', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const created = await new CreateRuleGroupUseCase(groups).Execute({
      GroupCode: 'R-COM',
      GroupName: 'Compliance Rules',
    });

    expect(created.CatalogState).toBe(RuleGroupCatalogState.Active);
  });

  it('rejects an empty group code', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await expect(new CreateRuleGroupUseCase(groups).Execute({ GroupCode: '  ', GroupName: 'x' })).rejects.toThrow(
      /GroupCode/,
    );
  });

  it('rejects a duplicate group code via pre-check with ConflictException', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const useCase = new CreateRuleGroupUseCase(groups);
    await useCase.Execute({ GroupCode: 'R-INT', GroupName: 'Integrity' });

    await expect(useCase.Execute({ GroupCode: 'R-INT', GroupName: 'Integrity dup' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('gets a rule group by id', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const created = await new CreateRuleGroupUseCase(groups).Execute({ GroupCode: 'R-RBAC', GroupName: 'RBAC' });

    const fetched = await new GetRuleGroupUseCase(groups).Execute(created.Id);
    expect(fetched.GroupCode).toBe('R-RBAC');
  });

  it('throws NotFoundException when getting a missing rule group', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await expect(new GetRuleGroupUseCase(groups).Execute('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists rule groups paginated and filters by catalog state', async () => {
    const groups = new InMemoryRuleGroupRepository();
    const create = new CreateRuleGroupUseCase(groups);
    await create.Execute({ GroupCode: 'R-MD', GroupName: 'MD', CatalogState: RuleGroupCatalogState.Active });
    await create.Execute({
      GroupCode: 'R-INBOUND',
      GroupName: 'Inbound',
      CatalogState: RuleGroupCatalogState.Placeholder,
    });

    const all = await new ListRuleGroupsUseCase(groups).Execute({});
    expect(all.Items).toHaveLength(2);
    expect(all.Meta.TotalItems).toBe(2);

    const placeholders = await new ListRuleGroupsUseCase(groups).Execute({
      CatalogState: RuleGroupCatalogState.Placeholder,
    });
    expect(placeholders.Items).toHaveLength(1);
    expect(placeholders.Items[0].GroupCode).toBe('R-INBOUND');
  });
});
