import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import {
  IWarehouseRepository,
  WarehouseListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';

export class ListWarehousesUseCase {
  constructor(private readonly warehouseRepository: IWarehouseRepository) {}

  public async Execute(query: WarehouseListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: WarehouseDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.warehouseRepository.List(paging.Skip, paging.Take, {
      SiteId: query.SiteId,
      Status: query.Status,
      WarehouseCode: query.WarehouseCode,
      WarehouseName: query.WarehouseName,
    });

    return ToPagedResult(result.Items.map(WarehouseDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
