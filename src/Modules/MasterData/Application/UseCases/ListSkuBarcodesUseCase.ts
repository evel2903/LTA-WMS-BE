import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import {
  ISkuBarcodeRepository,
  SkuBarcodeListFilter,
} from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';

export class ListSkuBarcodesUseCase {
  constructor(private readonly skuBarcodes: ISkuBarcodeRepository) {}

  public async Execute(query: SkuBarcodeListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: SkuBarcodeDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.skuBarcodes.List(paging.Skip, paging.Take, {
      SkuId: query.SkuId,
      OwnerId: query.OwnerId,
      UomId: query.UomId,
      BarcodeValue: query.BarcodeValue,
      Status: query.Status,
    });

    return ToPagedResult(result.Items.map(SkuBarcodeMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
