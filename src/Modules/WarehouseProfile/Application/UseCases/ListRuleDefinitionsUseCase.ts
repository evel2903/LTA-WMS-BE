import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { RuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/RuleDefinitionDto';
import {
  IRuleDefinitionRepository,
  RuleDefinitionListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { RuleDefinitionDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleDefinitionDtoMapper';

export class ListRuleDefinitionsUseCase {
  constructor(private readonly definitionRepository: IRuleDefinitionRepository) {}

  public async Execute(query: RuleDefinitionListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: RuleDefinitionDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.definitionRepository.List(paging.Skip, paging.Take, {
      RuleGroupId: query.RuleGroupId,
      PrecedenceTier: query.PrecedenceTier,
      ControlMode: query.ControlMode,
      Status: query.Status,
      WarehouseTypeCode: query.WarehouseTypeCode,
      WarehouseId: query.WarehouseId,
    });

    return ToPagedResult(
      result.Items.map(RuleDefinitionDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
