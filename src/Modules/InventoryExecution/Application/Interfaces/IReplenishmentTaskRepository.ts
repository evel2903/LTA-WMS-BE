import { EntityManager } from 'typeorm';
import { ReplenishmentTaskEntity } from '@modules/InventoryExecution/Domain/Entities/ReplenishmentTaskEntity';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';

export const REPLENISHMENT_TASK_REPOSITORY = Symbol('IReplenishmentTaskRepository');

export interface ReplenishmentTaskListFilter {
  WarehouseId?: string;
  OwnerId?: string;
  TaskStatus?: ReplenishmentTaskStatus;
  TriggerType?: ReplenishmentTriggerType;
}

export interface ReplenishmentTaskOpenQuantityFilter {
  TargetLocationId?: string;
  OwnerId?: string;
  SkuId?: string;
  UomId?: string | null;
  ExcludeTaskId?: string;
}

export interface IReplenishmentTaskRepository {
  Create(task: ReplenishmentTaskEntity, manager?: EntityManager): Promise<ReplenishmentTaskEntity>;
  Update(task: ReplenishmentTaskEntity, manager?: EntityManager): Promise<ReplenishmentTaskEntity>;
  FindById(id: string, manager?: EntityManager): Promise<ReplenishmentTaskEntity | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<ReplenishmentTaskEntity | null>;
  FindByReleaseIdempotencyKey(idempotencyKey: string, manager?: EntityManager): Promise<ReplenishmentTaskEntity | null>;
  SumOpenSourceQuantity(sourceBalanceId: string, excludeTaskId?: string, manager?: EntityManager): Promise<number>;
  SumOpenTargetQuantity(filter: ReplenishmentTaskOpenQuantityFilter, manager?: EntityManager): Promise<number>;
  List(
    skip: number,
    take: number,
    filter?: ReplenishmentTaskListFilter,
  ): Promise<{ Items: ReplenishmentTaskEntity[]; TotalItems: number }>;
}
