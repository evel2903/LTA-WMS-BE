import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import {
  IPartnerRepository,
  PartnerListFilter,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';

export class ListPartnersUseCase {
  constructor(private readonly partnerRepository: IPartnerRepository) {}

  public async Execute(query: PartnerListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: PartnerDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: PartnerListFilter = {};
    if (query.PartnerType) filter.PartnerType = query.PartnerType;
    if (query.Status) filter.Status = query.Status;
    if (query.PartnerCode) filter.PartnerCode = query.PartnerCode;
    if (query.PartnerName) filter.PartnerName = query.PartnerName;
    if (query.SourceSystem) filter.SourceSystem = query.SourceSystem;
    if (query.ExternalReference) filter.ExternalReference = query.ExternalReference;

    const result = await this.partnerRepository.List(paging.Skip, paging.Take, filter);
    return ToPagedResult(result.Items.map(PartnerDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
