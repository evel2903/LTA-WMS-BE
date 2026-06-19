import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import {
  AuditLogQueryFilter,
  IAuditLogRepository,
} from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { AuditLogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/AuditLogOrmMapper';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';

/** Read-only: no update/delete by design (audit is append-only). */
@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogOrmEntity)
    private readonly auditLogs: Repository<AuditLogOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<AuditLogEntity | null> {
    const entity = await this.auditLogs.findOne({ where: { Id: id } });
    return entity ? AuditLogOrmMapper.ToDomain(entity) : null;
  }

  public async Query(
    skip: number,
    take: number,
    filter: AuditLogQueryFilter = {},
  ): Promise<{ Items: AuditLogEntity[]; TotalItems: number }> {
    const query = this.auditLogs.createQueryBuilder('al');
    if (filter.ActorUserId) query.andWhere('al.ActorUserId = :actor', { actor: filter.ActorUserId });
    if (filter.Action) query.andWhere('al.Action = :action', { action: filter.Action });
    if (filter.ObjectType) query.andWhere('al.ObjectType = :objectType', { objectType: filter.ObjectType });
    if (filter.ObjectId) query.andWhere('al.ObjectId = :objectId', { objectId: filter.ObjectId });
    if (filter.ReasonCodeId) query.andWhere('al.ReasonCodeId = :reason', { reason: filter.ReasonCodeId });
    if (filter.From) query.andWhere('al.OccurredAt >= :from', { from: filter.From });
    if (filter.To) query.andWhere('al.OccurredAt <= :to', { to: filter.To });
    query.orderBy('al.OccurredAt', 'DESC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(AuditLogOrmMapper.ToDomain), TotalItems: total };
  }
}
