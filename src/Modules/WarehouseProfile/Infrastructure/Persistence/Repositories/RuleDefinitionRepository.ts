import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IRuleDefinitionRepository,
  RuleDefinitionListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { RuleDefinitionOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/RuleDefinitionOrmMapper';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';

@Injectable()
export class RuleDefinitionRepository implements IRuleDefinitionRepository {
  constructor(
    @InjectRepository(RuleDefinitionOrmEntity)
    private readonly definitions: Repository<RuleDefinitionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<RuleDefinitionEntity | null> {
    const entity = await this.definitions.findOne({ where: { Id: id } });
    return entity ? RuleDefinitionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(ruleCode: string): Promise<RuleDefinitionEntity | null> {
    const entity = await this.definitions.findOne({ where: { RuleCode: ruleCode } });
    return entity ? RuleDefinitionOrmMapper.ToDomain(entity) : null;
  }

  public async Create(definition: RuleDefinitionEntity, manager?: EntityManager): Promise<RuleDefinitionEntity> {
    const repo = manager ? manager.getRepository(RuleDefinitionOrmEntity) : this.definitions;
    try {
      const created = await repo.save(RuleDefinitionOrmMapper.ToOrm(definition));
      return RuleDefinitionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: RuleDefinitionListFilter = {},
  ): Promise<{ Items: RuleDefinitionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<RuleDefinitionOrmEntity> = {};
    if (filter.RuleGroupId) where.RuleGroupId = filter.RuleGroupId;
    if (filter.PrecedenceTier) where.PrecedenceTier = filter.PrecedenceTier;
    if (filter.ControlMode) where.ControlMode = filter.ControlMode;
    if (filter.Status) where.Status = filter.Status;
    if (filter.WarehouseTypeCode) where.WarehouseTypeCode = filter.WarehouseTypeCode;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;

    const [items, total] = await this.definitions.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(RuleDefinitionOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Rule code already exists');
    }
  }
}
