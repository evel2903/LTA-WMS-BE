import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { InventorySerialLookupDto } from '@modules/MasterData/Application/DTOs/InventorySerialLookupDto';
import {
  IInventorySerialLookupRepository,
  InventorySerialLookupFilter,
} from '@modules/MasterData/Application/Interfaces/IInventorySerialLookupRepository';
import { InventorySerialLookupDtoMapper } from '@modules/MasterData/Application/Mappers/InventorySerialLookupDtoMapper';

export class ListInventorySerialLookupUseCase {
  constructor(private readonly lookup: IInventorySerialLookupRepository) {}

  public async Execute(query: InventorySerialLookupFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: InventorySerialLookupDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.lookup.List(paging.Skip, paging.Take, {
      SkuId: query.SkuId,
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      SerialNumber: query.SerialNumber,
      LotNumber: query.LotNumber,
    });

    return ToPagedResult(
      result.Items.map(InventorySerialLookupDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
