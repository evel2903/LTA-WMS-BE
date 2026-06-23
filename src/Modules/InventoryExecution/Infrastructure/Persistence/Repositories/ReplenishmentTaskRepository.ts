import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IReplenishmentTaskRepository,
  ReplenishmentTaskOpenQuantityFilter,
  ReplenishmentTaskListFilter,
} from '@modules/InventoryExecution/Application/Interfaces/IReplenishmentTaskRepository';
import { ReplenishmentTaskEntity } from '@modules/InventoryExecution/Domain/Entities/ReplenishmentTaskEntity';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTaskOrmMapper } from '@modules/InventoryExecution/Infrastructure/Mappers/ReplenishmentTaskOrmMapper';
import { ReplenishmentTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/ReplenishmentTaskOrmEntity';

@Injectable()
export class ReplenishmentTaskRepository implements IReplenishmentTaskRepository {
  constructor(
    @InjectRepository(ReplenishmentTaskOrmEntity)
    private readonly replenishmentTasks: Repository<ReplenishmentTaskOrmEntity>,
  ) {}

  public async Create(task: ReplenishmentTaskEntity, manager?: EntityManager): Promise<ReplenishmentTaskEntity> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    try {
      const saved = await repo.save(ReplenishmentTaskOrmMapper.ToOrm(task));
      return ReplenishmentTaskOrmMapper.ToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(task: ReplenishmentTaskEntity, manager?: EntityManager): Promise<ReplenishmentTaskEntity> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    try {
      const saved = await repo.save(ReplenishmentTaskOrmMapper.ToOrm(task));
      return ReplenishmentTaskOrmMapper.ToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string, manager?: EntityManager): Promise<ReplenishmentTaskEntity | null> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    const entity = await repo.findOne({ where: { Id: id } });
    return entity ? ReplenishmentTaskOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<ReplenishmentTaskEntity | null> {
    const entity = await manager
      .getRepository(ReplenishmentTaskOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return entity ? ReplenishmentTaskOrmMapper.ToDomain(entity) : null;
  }

  public async FindByReleaseIdempotencyKey(
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<ReplenishmentTaskEntity | null> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    const entity = await repo.findOne({ where: { ReleaseIdempotencyKey: idempotencyKey } });
    return entity ? ReplenishmentTaskOrmMapper.ToDomain(entity) : null;
  }

  public async SumOpenSourceQuantity(
    sourceBalanceId: string,
    excludeTaskId?: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    const query = repo
      .createQueryBuilder('task')
      .select('COALESCE(SUM(task.quantity), 0)', 'quantity')
      .where('task.source_balance_id = :sourceBalanceId', { sourceBalanceId })
      .andWhere('task.task_status = :status', { status: ReplenishmentTaskStatus.Released });
    if (excludeTaskId) query.andWhere('task.id <> :excludeTaskId', { excludeTaskId });
    const row = await query.getRawOne<{ quantity?: string | number }>();
    return Number(row?.quantity ?? 0);
  }

  public async SumOpenTargetQuantity(
    filter: ReplenishmentTaskOpenQuantityFilter,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(ReplenishmentTaskOrmEntity) : this.replenishmentTasks;
    const query = repo
      .createQueryBuilder('task')
      .select('COALESCE(SUM(task.quantity), 0)', 'quantity')
      .where('task.target_location_id = :targetLocationId', { targetLocationId: filter.TargetLocationId })
      .andWhere('task.task_status = :status', { status: ReplenishmentTaskStatus.Released });
    if (filter.OwnerId) query.andWhere('task.owner_id = :ownerId', { ownerId: filter.OwnerId });
    if (filter.SkuId) query.andWhere('task.sku_id = :skuId', { skuId: filter.SkuId });
    if (filter.UomId !== undefined) query.andWhere('task.uom_id IS NOT DISTINCT FROM :uomId', { uomId: filter.UomId });
    if (filter.ExcludeTaskId) query.andWhere('task.id <> :excludeTaskId', { excludeTaskId: filter.ExcludeTaskId });
    const row = await query.getRawOne<{ quantity?: string | number }>();
    return Number(row?.quantity ?? 0);
  }

  public async List(
    skip: number,
    take: number,
    filter: ReplenishmentTaskListFilter = {},
  ): Promise<{ Items: ReplenishmentTaskEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<ReplenishmentTaskOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.TaskStatus) where.TaskStatus = filter.TaskStatus;
    if (filter.TriggerType) where.TriggerType = filter.TriggerType;
    const [items, total] = await this.replenishmentTasks.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(ReplenishmentTaskOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Replenishment task unique constraint violated');
    }
  }
}
