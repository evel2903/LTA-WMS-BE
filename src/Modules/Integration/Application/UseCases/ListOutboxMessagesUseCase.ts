import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { OutboxMessageDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';

export class ListOutboxMessagesUseCase {
  constructor(private readonly integrations: IIntegrationRepository) {}

  public async Execute(query: IntegrationListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: OutboxMessageDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: IntegrationListFilter = {};
    if (query.SourceSystem) filter.SourceSystem = query.SourceSystem;
    if (query.Status) filter.Status = query.Status;
    if (query.BusinessReference) filter.BusinessReference = query.BusinessReference;
    if (query.WarehouseContext) filter.WarehouseContext = query.WarehouseContext;
    if (query.OwnerContext) filter.OwnerContext = query.OwnerContext;
    const result = await this.integrations.ListOutboxMessages(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map((item) => IntegrationDtoMapper.ToOutboxMessageDto(item)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
