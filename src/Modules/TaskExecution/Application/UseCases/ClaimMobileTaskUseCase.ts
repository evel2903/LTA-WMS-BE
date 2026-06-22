import { ConflictException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { BuildMobileTaskAudit, TaskToAuditJson } from '@modules/TaskExecution/Application/UseCases/MobileTaskAudit';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';

export interface ClaimMobileTaskInput {
  Id: string;
  DeviceCode?: string | null;
  SessionId?: string | null;
}

type ClaimMobileTaskOutcome =
  | { Kind: 'Success'; Task: MobileTaskDto }
  | { Kind: 'Conflict'; TaskStatus: MobileTaskStatus };

export class ClaimMobileTaskUseCase {
  constructor(
    private readonly tasks: ITaskExecutionRepository,
    private readonly permissionChecker: IPermissionChecker | undefined,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(input: ClaimMobileTaskInput, context: AuditContext): Promise<MobileTaskDto> {
    const actorUserId = context.ActorUserId;
    if (!actorUserId) {
      throw new ForbiddenAppException('Authentication required', { Reason: 'NO_USER' });
    }

    const outcome = await this.audited.Run<ClaimMobileTaskOutcome>(async (manager) => {
      const current = await this.tasks.FindByIdForUpdate(input.Id, manager);
      if (!current) {
        throw new NotFoundException('Mobile task not found', { Id: input.Id });
      }
      await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Update, current);

      if (current.AssignedUserId) {
        return {
          result: { Kind: 'Conflict' as const, TaskStatus: current.TaskStatus },
          entry: BuildMobileTaskAudit(context, current, {
            ObjectCode: 'CLAIM_DENIED',
            BeforeJson: TaskToAuditJson(current),
            AfterJson: { RequestedByUserId: actorUserId, ExistingAssigneeUserId: current.AssignedUserId },
            Result: AuditResult.Blocked,
            ReasonNote: 'TASK_ALREADY_CLAIMED',
          }),
        };
      }

      if (current.TaskStatus !== MobileTaskStatus.Released) {
        throw new ConflictException('Mobile task cannot be claimed in current status', {
          Reason: 'TASK_STATUS_NOT_CLAIMABLE',
          TaskStatus: current.TaskStatus,
        });
      }

      const before = TaskToAuditJson(current);
      current.Claim(actorUserId, input);
      const saved = await this.tasks.Save(current, manager);
      return {
        result: { Kind: 'Success' as const, Task: MobileTaskDtoMapper.ToDto(saved) },
        entry: BuildMobileTaskAudit(context, saved, {
          ObjectCode: 'CLAIM',
          BeforeJson: before,
          AfterJson: TaskToAuditJson(saved),
        }),
      };
    });

    if (outcome.Kind === 'Conflict') {
      throw new ConflictException('Mobile task already claimed', {
        Reason: 'TASK_ALREADY_CLAIMED',
        TaskStatus: outcome.TaskStatus,
      });
    }

    return outcome.Task;
  }
}
