import { EntityManager } from 'typeorm';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

export const TASK_EXECUTION_REPOSITORY = Symbol('ITaskExecutionRepository');

export interface MobileTaskListFilter {
  WarehouseId?: string;
  TaskStatus?: MobileTaskStatus;
  TaskType?: MobileTaskType;
}

export interface ITaskExecutionRepository {
  FindCandidates(filter: MobileTaskListFilter): Promise<MobileTaskEntity[]>;
  FindById(id: string, manager?: EntityManager): Promise<MobileTaskEntity | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<MobileTaskEntity | null>;
  Save(task: MobileTaskEntity, manager?: EntityManager): Promise<MobileTaskEntity>;
}
