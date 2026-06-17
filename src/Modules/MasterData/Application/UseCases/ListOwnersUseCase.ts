import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { IOwnerRepository, OwnerListFilter } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';

export class ListOwnersUseCase {
  constructor(private readonly ownerRepository: IOwnerRepository) {}

  public async Execute(query: OwnerListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: OwnerDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.ownerRepository.List(paging.Skip, paging.Take, {
      OwnerCode: query.OwnerCode,
      OwnerName: query.OwnerName,
      Status: query.Status,
    });

    return ToPagedResult(result.Items.map(OwnerDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
