import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { IUomRepository, UomListFilter } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';

export class ListUomsUseCase {
  constructor(private readonly uomRepository: IUomRepository) {}

  public async Execute(query: UomListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: UomDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.uomRepository.List(paging.Skip, paging.Take, {
      UomCode: query.UomCode,
      UomName: query.UomName,
      UomType: query.UomType,
      Status: query.Status,
      Search: query.Search,
    });

    return ToPagedResult(result.Items.map(UomDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
