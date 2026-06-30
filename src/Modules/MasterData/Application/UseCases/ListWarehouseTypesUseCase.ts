import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { WarehouseTypeDto } from '@modules/MasterData/Application/DTOs/WarehouseTypeDto';
import {
  IWarehouseTypeRepository,
  WarehouseTypeListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { WarehouseTypeDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseTypeDtoMapper';
import { NormalizeWarehouseTypeCode } from '@modules/MasterData/Domain/Services/WarehouseTypeCodePolicy';

export class ListWarehouseTypesUseCase {
  constructor(private readonly warehouseTypes: IWarehouseTypeRepository) {}

  public async Execute(query: WarehouseTypeListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: WarehouseTypeDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const result = await this.warehouseTypes.List(paging.Skip, paging.Take, {
      WarehouseTypeCode: query.WarehouseTypeCode ? NormalizeWarehouseTypeCode(query.WarehouseTypeCode) : undefined,
      Status: query.Status,
    });

    return ToPagedResult(
      result.Items.map(WarehouseTypeDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
