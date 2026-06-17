import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import {
  ILocationRepository,
  LocationListFilter,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';

export class ListLocationsUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  public async Execute(query: LocationListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: LocationDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.locationRepository.List(paging.Skip, paging.Take, {
      WarehouseId: query.WarehouseId,
      ZoneId: query.ZoneId,
      ParentLocationId: query.ParentLocationId,
      LocationStatus: query.LocationStatus,
      LocationType: query.LocationType,
      LocationProfileId: query.LocationProfileId,
      LocationCode: query.LocationCode,
    });

    return ToPagedResult(result.Items.map(LocationDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
