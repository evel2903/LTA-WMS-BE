import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IZoneRepository, ZoneListFilter } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';

export class ListZonesUseCase {
  constructor(private readonly zoneRepository: IZoneRepository) {}

  public async Execute(query: ZoneListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: ZoneDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.zoneRepository.List(paging.Skip, paging.Take, {
      WarehouseId: query.WarehouseId,
      Status: query.Status,
      ZoneCode: query.ZoneCode,
    });

    return ToPagedResult(result.Items.map(ZoneDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
