import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { RuleGroupDto } from '@modules/WarehouseProfile/Application/DTOs/RuleGroupDto';
import {
  IRuleGroupRepository,
  RuleGroupListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleGroupDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleGroupDtoMapper';

export class ListRuleGroupsUseCase {
  constructor(private readonly groupRepository: IRuleGroupRepository) {}

  public async Execute(query: RuleGroupListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: RuleGroupDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.groupRepository.List(paging.Skip, paging.Take, {
      CatalogState: query.CatalogState,
    });

    return ToPagedResult(result.Items.map(RuleGroupDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
