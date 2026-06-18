import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { ItemCoverageDto } from '@modules/MasterData/Application/DTOs/ItemCoverageDto';
import {
  IItemCoverageRepository,
  ItemCoverageListFilter,
} from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { ItemCoverageMapper } from '@modules/MasterData/Application/Mappers/ItemCoverageMapper';

export class ListItemCoveragesUseCase {
  constructor(private readonly itemCoverages: IItemCoverageRepository) {}

  public async Execute(query: ItemCoverageListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: ItemCoverageDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.itemCoverages.List(paging.Skip, paging.Take, {
      SkuId: query.SkuId,
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      Status: query.Status,
    });

    return ToPagedResult(result.Items.map(ItemCoverageMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
