import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ListPutawayTasksDto, PutawayTaskDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/PutawayTaskDtoMapper';
import { CheckPutawayTaskPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';

export class ListPutawayTasksUseCase {
  private readonly batchSize = 1000;

  constructor(
    private readonly tasks: IPutawayTaskRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(query: ListPutawayTasksDto & { ActorUserId?: string | null }): Promise<{
    Items: PutawayTaskDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const candidates = await this.LoadAllTasks({
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      TaskStatus: query.TaskStatus,
      InboundPutawayReleaseId: query.InboundPutawayReleaseId,
    });
    const allowed: PutawayTaskEntity[] = [];
    for (const task of candidates) {
      if (
        await CheckPutawayTaskPermission(this.permissionChecker, query.ActorUserId, ActionCode.Read, {
          WarehouseId: task.WarehouseId,
          OwnerId: task.OwnerId,
        })
      ) {
        allowed.push(task);
      }
    }
    const pageItems = allowed.slice(paging.Skip, paging.Skip + paging.Take);
    return ToPagedResult(
      pageItems.map((task) => PutawayTaskDtoMapper.ToDto(task)),
      allowed.length,
      paging.Page,
      paging.PageSize,
    );
  }

  private async LoadAllTasks(filter: Parameters<IPutawayTaskRepository['List']>[2]): Promise<PutawayTaskEntity[]> {
    const items: PutawayTaskEntity[] = [];
    let skip = 0;
    let totalItems = Number.POSITIVE_INFINITY;

    while (skip < totalItems) {
      const page = await this.tasks.List(skip, this.batchSize, filter);
      items.push(...page.Items);
      totalItems = page.TotalItems;
      if (page.Items.length === 0 || page.Items.length < this.batchSize) break;
      skip += this.batchSize;
    }
    return items;
  }
}
