import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ListPutawayTasksDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskOrmMapper } from '@modules/InventoryExecution/Infrastructure/Mappers/PutawayTaskOrmMapper';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';

@Injectable()
export class PutawayTaskRepository implements IPutawayTaskRepository {
  constructor(
    @InjectRepository(PutawayTaskOrmEntity)
    private readonly tasks: Repository<PutawayTaskOrmEntity>,
  ) {}

  public async Create(task: PutawayTaskEntity, manager?: EntityManager): Promise<PutawayTaskEntity> {
    const repo = manager ? manager.getRepository(PutawayTaskOrmEntity) : this.tasks;
    try {
      const saved = await repo.save(PutawayTaskOrmMapper.ToOrm(task));
      return PutawayTaskOrmMapper.ToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string): Promise<PutawayTaskEntity | null> {
    const entity = await this.tasks.findOne({ where: { Id: id } });
    return entity ? PutawayTaskOrmMapper.ToDomain(entity) : null;
  }

  public async FindByInboundPutawayReleaseId(inboundPutawayReleaseId: string): Promise<PutawayTaskEntity | null> {
    const entity = await this.tasks.findOne({ where: { InboundPutawayReleaseId: inboundPutawayReleaseId } });
    return entity ? PutawayTaskOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdempotencyKey(
    inboundPutawayReleaseId: string,
    idempotencyKey: string,
  ): Promise<PutawayTaskEntity | null> {
    const entity = await this.tasks.findOne({
      where: { InboundPutawayReleaseId: inboundPutawayReleaseId, IdempotencyKey: idempotencyKey },
    });
    return entity ? PutawayTaskOrmMapper.ToDomain(entity) : null;
  }

  public async List(
    skip: number,
    take: number,
    filter: Omit<ListPutawayTasksDto, 'Page' | 'PageSize'> = {},
  ): Promise<{ Items: PutawayTaskEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<PutawayTaskOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.TaskStatus) where.TaskStatus = filter.TaskStatus;
    if (filter.InboundPutawayReleaseId) where.InboundPutawayReleaseId = filter.InboundPutawayReleaseId;

    const [items, total] = await this.tasks.findAndCount({
      where,
      order: { ReleasedAt: 'DESC', CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(PutawayTaskOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Putaway task already exists for inbound release or idempotency key');
    }
  }
}
