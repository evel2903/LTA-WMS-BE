import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { LabelTemplateDto } from '@modules/BarcodeLabel/Application/DTOs/LabelTemplateDto';
import {
  IBarcodeLabelRepository,
  LabelTemplateListFilter,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';

export class ListLabelTemplatesUseCase {
  constructor(private readonly labels: IBarcodeLabelRepository) {}

  public async Execute(query: LabelTemplateListFilter & { Page?: number; PageSize?: number }): Promise<{
    Items: LabelTemplateDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: LabelTemplateListFilter = {};
    if (query.TemplateCode) filter.TemplateCode = query.TemplateCode;
    if (query.LabelType) filter.LabelType = query.LabelType;
    if (query.Status) filter.Status = query.Status;

    const result = await this.labels.ListTemplates(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map(BarcodeLabelDtoMapper.ToTemplateDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
