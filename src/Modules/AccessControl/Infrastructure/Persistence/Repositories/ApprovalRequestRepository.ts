import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import {
  ApprovalRequestListFilter,
  IApprovalRequestRepository,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { ApprovalRequestOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/ApprovalRequestOrmMapper';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';

@Injectable()
export class ApprovalRequestRepository implements IApprovalRequestRepository {
  constructor(
    @InjectRepository(ApprovalRequestOrmEntity)
    private readonly approvalRequests: Repository<ApprovalRequestOrmEntity>,
  ) {}

  public async FindById(id: string, manager?: EntityManager): Promise<ApprovalRequestEntity | null> {
    const repo = manager ? manager.getRepository(ApprovalRequestOrmEntity) : this.approvalRequests;
    const entity = await repo.findOne({ where: { Id: id } });
    return entity ? ApprovalRequestOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<ApprovalRequestEntity | null> {
    const entity = await manager
      .getRepository(ApprovalRequestOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return entity ? ApprovalRequestOrmMapper.ToDomain(entity) : null;
  }

  public async Create(request: ApprovalRequestEntity, manager?: EntityManager): Promise<ApprovalRequestEntity> {
    const repo = manager ? manager.getRepository(ApprovalRequestOrmEntity) : this.approvalRequests;
    const created = await repo.save(ApprovalRequestOrmMapper.ToOrm(request));
    return ApprovalRequestOrmMapper.ToDomain(created);
  }

  public async Update(request: ApprovalRequestEntity, manager?: EntityManager): Promise<ApprovalRequestEntity> {
    const repo = manager ? manager.getRepository(ApprovalRequestOrmEntity) : this.approvalRequests;
    const updated = await repo.save(ApprovalRequestOrmMapper.ToOrm(request));
    return ApprovalRequestOrmMapper.ToDomain(updated);
  }

  public async List(
    skip: number,
    take: number,
    filter: ApprovalRequestListFilter = {},
  ): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }> {
    const query = this.approvalRequests.createQueryBuilder('ar');
    if (filter.Decision) query.andWhere('ar.Decision = :decision', { decision: filter.Decision });
    if (filter.RequesterUserId)
      query.andWhere('ar.RequesterUserId = :requester', { requester: filter.RequesterUserId });
    if (filter.TargetObjectType)
      query.andWhere('ar.TargetObjectType = :objectType', { objectType: filter.TargetObjectType });
    if (filter.TargetObjectId) query.andWhere('ar.TargetObjectId = :objectId', { objectId: filter.TargetObjectId });
    if (filter.Action) query.andWhere('ar.Action = :action', { action: filter.Action });
    query.orderBy('ar.CreatedAt', 'DESC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(ApprovalRequestOrmMapper.ToDomain), TotalItems: total };
  }
}
