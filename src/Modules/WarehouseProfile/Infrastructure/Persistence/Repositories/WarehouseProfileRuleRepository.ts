import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { WarehouseProfileRuleOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileRuleOrmMapper';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';

@Injectable()
export class WarehouseProfileRuleRepository implements IWarehouseProfileRuleRepository {
  constructor(
    @InjectRepository(WarehouseProfileRuleOrmEntity)
    private readonly bindings: Repository<WarehouseProfileRuleOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<WarehouseProfileRuleEntity | null> {
    const entity = await this.bindings.findOne({ where: { Id: id } });
    return entity ? WarehouseProfileRuleOrmMapper.ToDomain(entity) : null;
  }

  public async FindByProfileAndRule(
    warehouseProfileId: string,
    ruleDefinitionId: string,
  ): Promise<WarehouseProfileRuleEntity | null> {
    const entity = await this.bindings.findOne({
      where: { WarehouseProfileId: warehouseProfileId, RuleDefinitionId: ruleDefinitionId },
    });
    return entity ? WarehouseProfileRuleOrmMapper.ToDomain(entity) : null;
  }

  public async Create(
    binding: WarehouseProfileRuleEntity,
    manager?: EntityManager,
  ): Promise<WarehouseProfileRuleEntity> {
    const repo = manager ? manager.getRepository(WarehouseProfileRuleOrmEntity) : this.bindings;
    try {
      const created = await repo.save(WarehouseProfileRuleOrmMapper.ToOrm(binding));
      return WarehouseProfileRuleOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Delete(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(WarehouseProfileRuleOrmEntity) : this.bindings;
    await repo.delete({ Id: id });
  }

  public async ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
  ): Promise<{ Items: WarehouseProfileRuleEntity[]; TotalItems: number }> {
    const [items, total] = await this.bindings.findAndCount({
      where: { WarehouseProfileId: warehouseProfileId },
      order: { CreatedAt: 'ASC' },
      skip,
      take,
    });

    return {
      Items: items.map(WarehouseProfileRuleOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Rule is already bound to this profile');
    }
  }
}
