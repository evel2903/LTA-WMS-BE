import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  ExceptionCaseListFilter,
  IExceptionCaseRepository,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ExceptionCaseOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/ExceptionCaseOrmMapper';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';

/**
 * Exception case persistence (C9). Manager-aware FindById/Create/Update so a transition + its
 * audit row commit in one transaction. NO Delete: an exception case is never deleted.
 */
@Injectable()
export class ExceptionCaseRepository implements IExceptionCaseRepository {
  constructor(
    @InjectRepository(ExceptionCaseOrmEntity)
    private readonly cases: Repository<ExceptionCaseOrmEntity>,
  ) {}

  public async FindById(id: string, manager?: EntityManager): Promise<ExceptionCaseEntity | null> {
    const repo = manager ? manager.getRepository(ExceptionCaseOrmEntity) : this.cases;
    const entity = await repo.findOne({ where: { Id: id } });
    return entity ? ExceptionCaseOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<ExceptionCaseEntity | null> {
    const entity = await manager
      .getRepository(ExceptionCaseOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return entity ? ExceptionCaseOrmMapper.ToDomain(entity) : null;
  }

  public async Create(entity: ExceptionCaseEntity, manager?: EntityManager): Promise<ExceptionCaseEntity> {
    const repo = manager ? manager.getRepository(ExceptionCaseOrmEntity) : this.cases;
    const created = await repo.save(ExceptionCaseOrmMapper.ToOrm(entity));
    return ExceptionCaseOrmMapper.ToDomain(created);
  }

  public async Update(entity: ExceptionCaseEntity, manager?: EntityManager): Promise<ExceptionCaseEntity> {
    const repo = manager ? manager.getRepository(ExceptionCaseOrmEntity) : this.cases;
    const updated = await repo.save(ExceptionCaseOrmMapper.ToOrm(entity));
    return ExceptionCaseOrmMapper.ToDomain(updated);
  }

  public async List(
    skip: number,
    take: number,
    filter: ExceptionCaseListFilter = {},
  ): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }> {
    const query = this.cases.createQueryBuilder('ec');
    if (filter.State) query.andWhere('ec.State = :state', { state: filter.State });
    if (filter.ExceptionType)
      query.andWhere('ec.ExceptionType = :exceptionType', { exceptionType: filter.ExceptionType });
    if (filter.ReferenceType)
      query.andWhere('ec.ReferenceType = :referenceType', { referenceType: filter.ReferenceType });
    if (filter.ReferenceId) query.andWhere('ec.ReferenceId = :referenceId', { referenceId: filter.ReferenceId });
    if (filter.WarehouseId) query.andWhere('ec.WarehouseId = :warehouseId', { warehouseId: filter.WarehouseId });
    if (filter.OwnerId) query.andWhere('ec.OwnerId = :ownerId', { ownerId: filter.OwnerId });
    if (filter.AssignedToUserId)
      query.andWhere('ec.AssignedToUserId = :assignedToUserId', { assignedToUserId: filter.AssignedToUserId });
    if (filter.Severity) query.andWhere('ec.Severity = :severity', { severity: filter.Severity });
    query.orderBy('ec.CreatedAt', 'DESC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(ExceptionCaseOrmMapper.ToDomain), TotalItems: total };
  }
}
