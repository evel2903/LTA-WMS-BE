import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  IOverrideLogRepository,
  OverrideLogListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IOverrideLogRepository';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { OverrideLogOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/OverrideLogOrmMapper';
import { OverrideLogOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/OverrideLogOrmEntity';

/**
 * override_logs is append-only: this repository exposes Create (manager-aware so the insert
 * shares the audit transaction), FindById and a frequency-filtered List. It deliberately has NO
 * Update/Delete — immutability is also enforced by a DB trigger (migration 1781635000000).
 */
@Injectable()
export class OverrideLogRepository implements IOverrideLogRepository {
  constructor(
    @InjectRepository(OverrideLogOrmEntity)
    private readonly overrideLogs: Repository<OverrideLogOrmEntity>,
  ) {}

  public async Create(entity: OverrideLogEntity, manager?: EntityManager): Promise<OverrideLogEntity> {
    const repo = manager ? manager.getRepository(OverrideLogOrmEntity) : this.overrideLogs;
    const created = await repo.save(OverrideLogOrmMapper.ToOrm(entity));
    return OverrideLogOrmMapper.ToDomain(created);
  }

  public async FindById(id: string): Promise<OverrideLogEntity | null> {
    const entity = await this.overrideLogs.findOne({ where: { Id: id } });
    return entity ? OverrideLogOrmMapper.ToDomain(entity) : null;
  }

  public async List(
    skip: number,
    take: number,
    filter: OverrideLogListFilter = {},
  ): Promise<{ Items: OverrideLogEntity[]; TotalItems: number }> {
    const query = this.overrideLogs.createQueryBuilder('ol');
    if (filter.RuleId) query.andWhere('ol.RuleId = :ruleId', { ruleId: filter.RuleId });
    if (filter.ActorUserId) query.andWhere('ol.ActorUserId = :actor', { actor: filter.ActorUserId });
    if (filter.TargetObjectType)
      query.andWhere('ol.TargetObjectType = :objectType', { objectType: filter.TargetObjectType });
    if (filter.TargetObjectId) query.andWhere('ol.TargetObjectId = :objectId', { objectId: filter.TargetObjectId });
    if (filter.From) query.andWhere('ol.CreatedAt >= :from', { from: filter.From });
    if (filter.To) query.andWhere('ol.CreatedAt <= :to', { to: filter.To });
    query.orderBy('ol.CreatedAt', 'DESC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(OverrideLogOrmMapper.ToDomain), TotalItems: total };
  }
}
