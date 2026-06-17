import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import {
  ILocationProfileRepository,
  LocationProfileListFilter,
} from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';

export class ListLocationProfilesUseCase {
  constructor(private readonly locationProfileRepository: ILocationProfileRepository) {}

  public async Execute(query: LocationProfileListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: LocationProfileDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.locationProfileRepository.List(paging.Skip, paging.Take, {
      Status: query.Status,
      LocationType: query.LocationType,
      ProfileCode: query.ProfileCode,
    });

    return ToPagedResult(
      result.Items.map(LocationProfileDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
