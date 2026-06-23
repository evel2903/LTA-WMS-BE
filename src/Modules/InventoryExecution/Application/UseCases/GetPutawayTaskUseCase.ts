import { NotFoundException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { PutawayTaskDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/PutawayTaskDtoMapper';
import { AssertPutawayTaskPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';

export class GetPutawayTaskUseCase {
  constructor(
    private readonly tasks: IPutawayTaskRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, actorUserId?: string | null): Promise<PutawayTaskDto> {
    const task = await this.tasks.FindById(id);
    if (!task) throw new NotFoundException('Putaway task not found');
    await AssertPutawayTaskPermission(this.permissionChecker, actorUserId, ActionCode.Read, {
      WarehouseId: task.WarehouseId,
      OwnerId: task.OwnerId,
    });
    return PutawayTaskDtoMapper.ToDto(task);
  }
}
