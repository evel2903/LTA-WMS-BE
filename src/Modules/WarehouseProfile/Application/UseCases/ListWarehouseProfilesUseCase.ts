import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import {
  IWarehouseProfileRepository,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';

export class ListWarehouseProfilesUseCase {
  constructor(private readonly profileRepository: IWarehouseProfileRepository) {}

  public async Execute(query: WarehouseProfileListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: WarehouseProfileDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.profileRepository.List(paging.Skip, paging.Take, {
      Status: query.Status,
      WarehouseTypeCode: query.WarehouseTypeCode,
      WarehouseId: query.WarehouseId,
      Search: query.Search,
    });

    return ToPagedResult(
      result.Items.map(WarehouseProfileDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
