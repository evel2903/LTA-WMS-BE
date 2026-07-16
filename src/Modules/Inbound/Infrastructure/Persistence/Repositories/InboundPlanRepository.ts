import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ListInboundPlansDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import {
  IInboundPlanRepository,
  InboundPlanAggregate,
} from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundOrmMapper } from '@modules/Inbound/Infrastructure/Mappers/InboundOrmMapper';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';

@Injectable()
export class InboundPlanRepository implements IInboundPlanRepository {
  constructor(
    @InjectRepository(InboundPlanOrmEntity)
    private readonly plans: Repository<InboundPlanOrmEntity>,
    @InjectRepository(InboundPlanLineOrmEntity)
    private readonly lines: Repository<InboundPlanLineOrmEntity>,
  ) {}

  public async Create(
    plan: InboundPlanEntity,
    lines: InboundPlanLineEntity[],
    manager?: EntityManager,
  ): Promise<InboundPlanAggregate> {
    const planRepo = manager ? manager.getRepository(InboundPlanOrmEntity) : this.plans;
    const lineRepo = manager ? manager.getRepository(InboundPlanLineOrmEntity) : this.lines;
    try {
      const savedPlan = await planRepo.save(InboundOrmMapper.ToPlanOrm(plan));
      const savedLines = await lineRepo.save(lines.map(InboundOrmMapper.ToLineOrm));
      return {
        Plan: InboundOrmMapper.ToPlanDomain(savedPlan),
        Lines: savedLines.map(InboundOrmMapper.ToLineDomain),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async UpdatePlan(plan: InboundPlanEntity, manager?: EntityManager): Promise<InboundPlanEntity> {
    const repo = manager ? manager.getRepository(InboundPlanOrmEntity) : this.plans;
    try {
      const saved = await repo.save(InboundOrmMapper.ToPlanOrm(plan));
      return InboundOrmMapper.ToPlanDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async ReplaceLines(
    planId: string,
    lines: InboundPlanLineEntity[],
    manager?: EntityManager,
  ): Promise<InboundPlanLineEntity[]> {
    const lineRepo = manager ? manager.getRepository(InboundPlanLineOrmEntity) : this.lines;
    await lineRepo.delete({ InboundPlanId: planId });
    const saved = await lineRepo.save(lines.map(InboundOrmMapper.ToLineOrm));
    return saved.map(InboundOrmMapper.ToLineDomain);
  }

  public async FindById(id: string): Promise<InboundPlanAggregate | null> {
    const plan = await this.plans.findOne({ where: { Id: id } });
    if (!plan) return null;
    const lines = await this.lines.find({ where: { InboundPlanId: id }, order: { LineNumber: 'ASC' } });
    return { Plan: InboundOrmMapper.ToPlanDomain(plan), Lines: lines.map(InboundOrmMapper.ToLineDomain) };
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<InboundPlanAggregate | null> {
    const plan = await manager
      .getRepository(InboundPlanOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    if (!plan) return null;
    const lines = await manager
      .getRepository(InboundPlanLineOrmEntity)
      .find({ where: { InboundPlanId: id }, order: { LineNumber: 'ASC' } });
    return { Plan: InboundOrmMapper.ToPlanDomain(plan), Lines: lines.map(InboundOrmMapper.ToLineDomain) };
  }

  public async FindByBusinessKey(
    sourceSystem: string,
    sourceDocumentType: string,
    sourceDocumentNumber: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<InboundPlanAggregate | null> {
    const plan = await this.plans.findOne({
      where: {
        SourceSystem: sourceSystem,
        SourceDocumentType: sourceDocumentType,
        SourceDocumentNumber: sourceDocumentNumber,
        OwnerId: ownerId,
        WarehouseId: warehouseId,
      },
    });
    if (!plan) return null;
    const lines = await this.lines.find({ where: { InboundPlanId: plan.Id }, order: { LineNumber: 'ASC' } });
    return { Plan: InboundOrmMapper.ToPlanDomain(plan), Lines: lines.map(InboundOrmMapper.ToLineDomain) };
  }

  public async List(
    skip: number,
    take: number,
    filter: Omit<ListInboundPlansDto, 'Page' | 'PageSize'> = {},
  ): Promise<{ Items: InboundPlanAggregate[]; TotalItems: number }> {
    const where = this.BuildWhere(filter);
    const [plans, total] = await this.plans.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    const ids = plans.map((plan) => plan.Id);
    const lines = ids.length ? await this.lines.find({ where: ids.map((id) => ({ InboundPlanId: id })) }) : [];
    return {
      Items: plans.map((plan) => ({
        Plan: InboundOrmMapper.ToPlanDomain(plan),
        Lines: lines
          .filter((line) => line.InboundPlanId === plan.Id)
          .sort((a, b) => a.LineNumber - b.LineNumber)
          .map(InboundOrmMapper.ToLineDomain),
      })),
      TotalItems: total,
    };
  }

  public async FindCandidates(
    filter: Omit<ListInboundPlansDto, 'Page' | 'PageSize'> = {},
  ): Promise<InboundPlanAggregate[]> {
    const where = this.BuildWhere(filter);
    const plans = await this.plans.find({ where, order: { CreatedAt: 'DESC' } });
    const ids = plans.map((plan) => plan.Id);
    const lines = ids.length ? await this.lines.find({ where: ids.map((id) => ({ InboundPlanId: id })) }) : [];
    return plans.map((plan) => ({
      Plan: InboundOrmMapper.ToPlanDomain(plan),
      Lines: lines
        .filter((line) => line.InboundPlanId === plan.Id)
        .sort((a, b) => a.LineNumber - b.LineNumber)
        .map(InboundOrmMapper.ToLineDomain),
    }));
  }

  private BuildWhere(filter: Omit<ListInboundPlansDto, 'Page' | 'PageSize'>): FindOptionsWhere<InboundPlanOrmEntity> {
    const where: FindOptionsWhere<InboundPlanOrmEntity> = {};
    if (filter.SourceSystem) where.SourceSystem = filter.SourceSystem;
    if (filter.SourceDocumentNumber) where.SourceDocumentNumber = filter.SourceDocumentNumber;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.Status) where.Status = filter.Status;
    return where;
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Inbound plan unique constraint violated');
    }
  }
}
