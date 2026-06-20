import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IRuleGroupRepository,
  RuleGroupListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleGroupOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/RuleGroupOrmMapper';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';

@Injectable()
export class RuleGroupRepository implements IRuleGroupRepository {
  constructor(
    @InjectRepository(RuleGroupOrmEntity)
    private readonly groups: Repository<RuleGroupOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<RuleGroupEntity | null> {
    const entity = await this.groups.findOne({ where: { Id: id } });
    return entity ? RuleGroupOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(groupCode: string): Promise<RuleGroupEntity | null> {
    const entity = await this.groups.findOne({ where: { GroupCode: groupCode } });
    return entity ? RuleGroupOrmMapper.ToDomain(entity) : null;
  }

  public async Create(group: RuleGroupEntity, manager?: EntityManager): Promise<RuleGroupEntity> {
    const repo = manager ? manager.getRepository(RuleGroupOrmEntity) : this.groups;
    try {
      const created = await repo.save(RuleGroupOrmMapper.ToOrm(group));
      return RuleGroupOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: RuleGroupListFilter = {},
  ): Promise<{ Items: RuleGroupEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<RuleGroupOrmEntity> = {};
    if (filter.CatalogState) where.CatalogState = filter.CatalogState;

    const [items, total] = await this.groups.findAndCount({
      where,
      order: { DisplayOrder: 'ASC', CreatedAt: 'ASC' },
      skip,
      take,
    });

    return {
      Items: items.map(RuleGroupOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Rule group code already exists');
    }
  }
}
