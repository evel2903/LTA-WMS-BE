import { EntityManager } from 'typeorm';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
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
  FindBySourceDocument(
    sourceDocumentType: string,
    sourceDocumentId: string,
    manager?: EntityManager,
  ): Promise<MobileTaskEntity | null>;
  FindScanEventsByTaskId(taskId: string, manager?: EntityManager): Promise<MobileScanEventEntity[]>;
  Save(task: MobileTaskEntity, manager?: EntityManager): Promise<MobileTaskEntity>;
  SaveScanEvent(scan: MobileScanEventEntity, manager?: EntityManager): Promise<MobileScanEventEntity>;
  RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T>;
}
