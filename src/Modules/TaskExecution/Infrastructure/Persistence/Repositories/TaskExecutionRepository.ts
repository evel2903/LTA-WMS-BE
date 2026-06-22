import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ITaskExecutionRepository,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanEventOrmMapper } from '@modules/TaskExecution/Infrastructure/Mappers/MobileScanEventOrmMapper';
import { MobileTaskOrmMapper } from '@modules/TaskExecution/Infrastructure/Mappers/MobileTaskOrmMapper';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';

@Injectable()
export class TaskExecutionRepository implements ITaskExecutionRepository {
  constructor(@InjectRepository(MobileTaskOrmEntity) private readonly repo: Repository<MobileTaskOrmEntity>) {}

  public async FindCandidates(filter: MobileTaskListFilter): Promise<MobileTaskEntity[]> {
    const qb = this.repo
      .createQueryBuilder('task')
      .orderBy('task.Priority', 'DESC')
      .addOrderBy('task.CreatedAt', 'ASC');
    if (filter.WarehouseId) {
      qb.andWhere('task.WarehouseId = :warehouseId', { warehouseId: filter.WarehouseId });
    }
    if (filter.TaskStatus) {
      qb.andWhere('task.TaskStatus = :taskStatus', { taskStatus: filter.TaskStatus });
    }
    if (filter.TaskType) {
      qb.andWhere('task.TaskType = :taskType', { taskType: filter.TaskType });
    }
    const rows = await qb.getMany();
    return rows.map(MobileTaskOrmMapper.ToDomain);
  }

  public async FindById(id: string, manager?: EntityManager): Promise<MobileTaskEntity | null> {
    const repository = manager?.getRepository(MobileTaskOrmEntity) ?? this.repo;
    const row = await repository.findOne({ where: { Id: id } });
    return row ? MobileTaskOrmMapper.ToDomain(row) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<MobileTaskEntity | null> {
    const row = await manager
      .getRepository(MobileTaskOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return row ? MobileTaskOrmMapper.ToDomain(row) : null;
  }

  public async Save(task: MobileTaskEntity, manager?: EntityManager): Promise<MobileTaskEntity> {
    const repository = manager?.getRepository(MobileTaskOrmEntity) ?? this.repo;
    const saved = await repository.save(MobileTaskOrmMapper.ToOrm(task));
    return MobileTaskOrmMapper.ToDomain(saved);
  }

  public async SaveScanEvent(scan: MobileScanEventEntity, manager?: EntityManager): Promise<MobileScanEventEntity> {
    const repository =
      manager?.getRepository(MobileScanEventOrmEntity) ?? this.repo.manager.getRepository(MobileScanEventOrmEntity);
    const saved = await repository.save(MobileScanEventOrmMapper.ToOrm(scan));
    return MobileScanEventOrmMapper.ToDomain(saved);
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.repo.manager.transaction(work);
  }
}
