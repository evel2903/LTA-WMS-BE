import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import {
  IBarcodeLabelRepository,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { CheckPrintJobPermission } from '@modules/BarcodeLabel/Application/UseCases/PrintJobPermission';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';

export class ListPrintJobsUseCase {
  private readonly batchSize = 1000;

  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    query: PrintJobListFilter & { Page?: number; PageSize?: number; ActorUserId?: string | null },
  ): Promise<{
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

    if (!this.permissionChecker) {
      const result = await this.labels.ListPrintJobs(paging.Skip, paging.Take, filter);
      return ToPagedResult(
        result.Items.map(BarcodeLabelDtoMapper.ToPrintJobDto),
        result.TotalItems,
        paging.Page,
        paging.PageSize,
      );
    }

    const printJobs = await this.LoadAllPrintJobs(filter);
    const allowed: PrintJobEntity[] = [];
    for (const printJob of printJobs) {
      if (
        await CheckPrintJobPermission(this.permissionChecker, query.ActorUserId, ActionCode.Read, {
          WarehouseId: printJob.WarehouseId,
          OwnerId: printJob.OwnerId,
        })
      ) {
        allowed.push(printJob);
      }
    }

    const pageItems = allowed.slice(paging.Skip, paging.Skip + paging.Take);
    return ToPagedResult(
      pageItems.map(BarcodeLabelDtoMapper.ToPrintJobDto),
      allowed.length,
      paging.Page,
      paging.PageSize,
    );
  }

  private async LoadAllPrintJobs(filter: PrintJobListFilter): Promise<PrintJobEntity[]> {
    const items: PrintJobEntity[] = [];
    let skip = 0;
    let totalItems = Number.POSITIVE_INFINITY;

    while (skip < totalItems) {
      const page = await this.labels.ListPrintJobs(skip, this.batchSize, filter);
      items.push(...page.Items);
      totalItems = page.TotalItems;
      if (page.Items.length === 0 || page.Items.length < this.batchSize) break;
      skip += this.batchSize;
    }
    return items;
  }
}
