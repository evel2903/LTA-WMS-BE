import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import {
  IReasonCodeRepository,
  ReasonCodeListFilter,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { ReasonCodeOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/ReasonCodeOrmMapper';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';

@Injectable()
export class ReasonCodeRepository implements IReasonCodeRepository {
  constructor(
    @InjectRepository(ReasonCodeOrmEntity)
    private readonly reasonCodes: Repository<ReasonCodeOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<ReasonCodeEntity | null> {
    const entity = await this.reasonCodes.findOne({ where: { Id: id } });
    return entity ? ReasonCodeOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(reasonCode: string): Promise<ReasonCodeEntity | null> {
    const entity = await this.reasonCodes.findOne({ where: { ReasonCode: reasonCode } });
    return entity ? ReasonCodeOrmMapper.ToDomain(entity) : null;
  }

  public async Create(reasonCode: ReasonCodeEntity, manager?: EntityManager): Promise<ReasonCodeEntity> {
    const repo = manager ? manager.getRepository(ReasonCodeOrmEntity) : this.reasonCodes;
    try {
      const created = await repo.save(ReasonCodeOrmMapper.ToOrm(reasonCode));
      return ReasonCodeOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(reasonCode: ReasonCodeEntity, manager?: EntityManager): Promise<ReasonCodeEntity> {
    const repo = manager ? manager.getRepository(ReasonCodeOrmEntity) : this.reasonCodes;
    try {
      const updated = await repo.save(ReasonCodeOrmMapper.ToOrm(reasonCode));
      return ReasonCodeOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: ReasonCodeListFilter = {},
  ): Promise<{ Items: ReasonCodeEntity[]; TotalItems: number }> {
    const query = this.reasonCodes.createQueryBuilder('rc');
    if (filter.ReasonGroup) query.andWhere('rc.ReasonGroup = :group', { group: filter.ReasonGroup });
    if (filter.Status) query.andWhere('rc.Status = :status', { status: filter.Status });
    if (filter.Action) {
      query.andWhere('rc.AppliesToActions @> :action::jsonb', { action: JSON.stringify([filter.Action]) });
    }
    query.orderBy('rc.ReasonCode', 'ASC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(ReasonCodeOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Reason code already exists');
    }
  }
}
