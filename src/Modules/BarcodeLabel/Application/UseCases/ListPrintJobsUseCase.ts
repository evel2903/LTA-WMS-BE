import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import {
  IBarcodeLabelRepository,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';

export class ListPrintJobsUseCase {
  constructor(private readonly labels: IBarcodeLabelRepository) {}

  public async Execute(query: PrintJobListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: PrintJobDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: PrintJobListFilter = {};
    if (query.TemplateId) filter.TemplateId = query.TemplateId;
    if (query.BusinessObjectType) filter.BusinessObjectType = query.BusinessObjectType;
    if (query.BusinessObjectId) filter.BusinessObjectId = query.BusinessObjectId;
    if (query.Status) filter.Status = query.Status;

    const result = await this.labels.ListPrintJobs(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map(BarcodeLabelDtoMapper.ToPrintJobDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
