import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ListPutawayTasksDto, PutawayTaskDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/PutawayTaskDtoMapper';
import { CheckPutawayTaskPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';

export class ListPutawayTasksUseCase {
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
    const result = await this.tasks.List(0, 1000, {
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      TaskStatus: query.TaskStatus,
      InboundPutawayReleaseId: query.InboundPutawayReleaseId,
    });
    const allowed: PutawayTaskEntity[] = [];
    for (const task of result.Items) {
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
}
