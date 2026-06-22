import { ConflictException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { BuildMobileTaskAudit, TaskToAuditJson } from '@modules/TaskExecution/Application/UseCases/MobileTaskAudit';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';

export interface ReleaseMobileTaskInput {
  Id: string;
}

export class ReleaseMobileTaskUseCase {
  constructor(
    private readonly tasks: ITaskExecutionRepository,
    private readonly permissionChecker: IPermissionChecker | undefined,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(input: ReleaseMobileTaskInput, context: AuditContext): Promise<MobileTaskDto> {
    const actorUserId = context.ActorUserId;
    if (!actorUserId) {
      throw new ForbiddenAppException('Authentication required', { Reason: 'NO_USER' });
    }

    return await this.audited.Run(async (manager) => {
      const current = await this.tasks.FindByIdForUpdate(input.Id, manager);
      if (!current) {
        throw new NotFoundException('Mobile task not found', { Id: input.Id });
      }
      await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Update, current);

      if (!current.AssignedUserId) {
        throw new ConflictException('Mobile task is not claimed', { Reason: 'TASK_NOT_CLAIMED' });
      }
      if (current.AssignedUserId !== actorUserId) {
        throw new ForbiddenAppException('Only the current claimant can release this mobile task', {
          Reason: 'NOT_TASK_CLAIMANT',
        });
      }
      if (![MobileTaskStatus.Claimed, MobileTaskStatus.InProgress].includes(current.TaskStatus)) {
        throw new ConflictException('Mobile task cannot be released in current status', {
          Reason: 'TASK_STATUS_NOT_RELEASABLE',
          TaskStatus: current.TaskStatus,
        });
      }

      const before = TaskToAuditJson(current);
      current.Release(actorUserId);
      const saved = await this.tasks.Save(current, manager);
      return {
        result: MobileTaskDtoMapper.ToDto(saved),
        entry: BuildMobileTaskAudit(context, saved, {
          ObjectCode: 'RELEASE',
          BeforeJson: before,
          AfterJson: TaskToAuditJson(saved),
        }),
      };
    });
  }
}
