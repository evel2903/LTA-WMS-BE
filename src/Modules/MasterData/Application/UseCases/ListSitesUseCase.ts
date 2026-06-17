import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { ISiteRepository, SiteListFilter } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';

export class ListSitesUseCase {
  constructor(private readonly siteRepository: ISiteRepository) {}

  public async Execute(query: SiteListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: SiteDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.siteRepository.List(paging.Skip, paging.Take, {
      Status: query.Status,
      SiteCode: query.SiteCode,
    });

    return ToPagedResult(result.Items.map(SiteDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
