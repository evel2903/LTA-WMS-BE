import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { ISkuRepository, SkuListFilter } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';

export class ListSkusUseCase {
  constructor(private readonly skuRepository: ISkuRepository) {}

  public async Execute(query: SkuListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: SkuDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.skuRepository.List(paging.Skip, paging.Take, {
      SkuCode: query.SkuCode,
      SkuName: query.SkuName,
      DefaultOwnerId: query.DefaultOwnerId,
      ItemClass: query.ItemClass,
      ItemStatus: query.ItemStatus,
    });

    return ToPagedResult(result.Items.map(SkuDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
