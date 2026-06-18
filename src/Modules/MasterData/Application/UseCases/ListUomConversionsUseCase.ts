import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import {
  IUomConversionRepository,
  UomConversionListFilter,
} from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { UomConversionMapper } from '@modules/MasterData/Application/Mappers/UomConversionMapper';

export class ListUomConversionsUseCase {
  constructor(private readonly uomConversions: IUomConversionRepository) {}

  public async Execute(query: UomConversionListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: UomConversionDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.uomConversions.List(paging.Skip, paging.Take, {
      SkuId: query.SkuId,
      FromUomId: query.FromUomId,
      ToUomId: query.ToUomId,
      Status: query.Status,
      EffectiveFrom: query.EffectiveFrom,
    });

    return ToPagedResult(result.Items.map(UomConversionMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
