import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { CheckMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';

export interface ListMobileTasksInput extends MobileTaskListFilter {
  Page?: number;
  PageSize?: number;
  ActorUserId?: string | null;
}

export class ListMobileTasksUseCase {
  constructor(
    private readonly tasks: ITaskExecutionRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(query: ListMobileTasksInput): Promise<{
    Items: MobileTaskDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const candidates = await this.tasks.FindCandidates({
      WarehouseId: query.WarehouseId,
      TaskStatus: query.TaskStatus,
      TaskType: query.TaskType,
    });
    const allowed: MobileTaskEntity[] = [];
    for (const task of candidates) {
      if (await CheckMobileTaskPermission(this.permissionChecker, query.ActorUserId, ActionCode.Read, task)) {
        allowed.push(task);
      }
    }
    const pageItems = allowed.slice(paging.Skip, paging.Skip + paging.Take);
    return ToPagedResult(pageItems.map(MobileTaskDtoMapper.ToDto), allowed.length, paging.Page, paging.PageSize);
  }
}
