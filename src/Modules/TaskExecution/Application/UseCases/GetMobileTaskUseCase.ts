import { NotFoundException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';

export class GetMobileTaskUseCase {
  constructor(
    private readonly tasks: ITaskExecutionRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, actorUserId?: string | null): Promise<MobileTaskDto> {
    const task = await this.tasks.FindById(id);
    if (!task) {
      throw new NotFoundException('Mobile task not found', { Id: id });
    }
    await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Read, task);
    return MobileTaskDtoMapper.ToDto(task);
  }
}
