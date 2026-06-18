import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import {
  IPackDefinitionRepository,
  PackDefinitionListFilter,
} from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { PackDefinitionMapper } from '@modules/MasterData/Application/Mappers/PackDefinitionMapper';

export class ListPackDefinitionsUseCase {
  constructor(private readonly packDefinitions: IPackDefinitionRepository) {}

  public async Execute(query: PackDefinitionListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: PackDefinitionDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.packDefinitions.List(paging.Skip, paging.Take, {
      SkuId: query.SkuId,
      UomId: query.UomId,
      PackCode: query.PackCode,
      Status: query.Status,
    });

    return ToPagedResult(result.Items.map(PackDefinitionMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
