import { EntityManager } from 'typeorm';
import { ListPutawayTasksDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';

export const PUTAWAY_TASK_REPOSITORY = Symbol('IPutawayTaskRepository');

export interface IPutawayTaskRepository {
  Create(task: PutawayTaskEntity, manager?: EntityManager): Promise<PutawayTaskEntity>;
  FindById(id: string): Promise<PutawayTaskEntity | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<PutawayTaskEntity | null>;
  FindByInboundPutawayReleaseId(inboundPutawayReleaseId: string): Promise<PutawayTaskEntity | null>;
  FindByIdempotencyKey(inboundPutawayReleaseId: string, idempotencyKey: string): Promise<PutawayTaskEntity | null>;
  Save(task: PutawayTaskEntity, manager?: EntityManager): Promise<PutawayTaskEntity>;
  List(
    skip: number,
    take: number,
    filter?: Omit<ListPutawayTasksDto, 'Page' | 'PageSize'>,
  ): Promise<{ Items: PutawayTaskEntity[]; TotalItems: number }>;
}
