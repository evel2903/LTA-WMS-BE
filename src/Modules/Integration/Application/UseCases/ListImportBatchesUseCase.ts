import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { ImportBatchDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';

type ListImportBatchesQuery = Pick<IntegrationListFilter, 'SourceSystem' | 'Status'> & {
  Page?: number;
  PageSize?: number;
};

export class ListImportBatchesUseCase {
  constructor(private readonly integrations: IIntegrationRepository) {}

  public async Execute(query: ListImportBatchesQuery): Promise<{
    Items: ImportBatchDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: IntegrationListFilter = {};
    if (query.SourceSystem) filter.SourceSystem = query.SourceSystem;
    if (query.Status) filter.Status = query.Status;
    const result = await this.integrations.ListImportBatches(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map(IntegrationDtoMapper.ToImportBatchDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
