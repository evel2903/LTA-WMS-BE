import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { OutboxMessageDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';

type ListOutboxMessagesQuery = Omit<
  IntegrationListFilter,
  'CreatedFrom' | 'CreatedTo' | 'UpdatedFrom' | 'UpdatedTo'
> & {
  Page?: number;
  PageSize?: number;
  CreatedFrom?: string | Date;
  CreatedTo?: string | Date;
  UpdatedFrom?: string | Date;
  UpdatedTo?: string | Date;
};

export class ListOutboxMessagesUseCase {
  constructor(private readonly integrations: IIntegrationRepository) {}

  public async Execute(query: ListOutboxMessagesQuery): Promise<{
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
    if (query.EventType) filter.EventType = query.EventType;
    if (query.BusinessReference) filter.BusinessReference = query.BusinessReference;
    if (query.WarehouseContext) filter.WarehouseContext = query.WarehouseContext;
    if (query.OwnerContext) filter.OwnerContext = query.OwnerContext;
    if (query.CreatedFrom) filter.CreatedFrom = this.ToDate(query.CreatedFrom);
    if (query.CreatedTo) filter.CreatedTo = this.ToDate(query.CreatedTo);
    if (query.UpdatedFrom) filter.UpdatedFrom = this.ToDate(query.UpdatedFrom);
    if (query.UpdatedTo) filter.UpdatedTo = this.ToDate(query.UpdatedTo);
    const result = await this.integrations.ListOutboxMessages(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map((item) => IntegrationDtoMapper.ToOutboxMessageDto(item)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }

  private ToDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
