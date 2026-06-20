import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IInventoryBalanceRepository,
  InventoryBalanceListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryBalanceOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryBalanceOrmMapper';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';

@Injectable()
export class InventoryBalanceRepository implements IInventoryBalanceRepository {
  constructor(
    @InjectRepository(InventoryBalanceOrmEntity)
    private readonly inventoryBalances: Repository<InventoryBalanceOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<InventoryBalanceEntity | null> {
    const entity = await this.inventoryBalances.findOne({ where: { Id: id } });
    return entity ? InventoryBalanceOrmMapper.ToDomain(entity) : null;
  }

  public async FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    const entity = await this.inventoryBalances.findOne({ where: { DimensionId: dimensionId } });
    return entity ? InventoryBalanceOrmMapper.ToDomain(entity) : null;
  }

  public async Create(balance: InventoryBalanceEntity, manager?: EntityManager): Promise<InventoryBalanceEntity> {
    const repo = manager ? manager.getRepository(InventoryBalanceOrmEntity) : this.inventoryBalances;
    try {
      const created = await repo.save(InventoryBalanceOrmMapper.ToOrm(balance));
      return InventoryBalanceOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: InventoryBalanceListFilter = {},
  ): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<InventoryBalanceOrmEntity> = {};
    if (filter.DimensionId) where.DimensionId = filter.DimensionId;

    const [items, total] = await this.inventoryBalances.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(InventoryBalanceOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Inventory balance unique constraint violated');
    }
  }
}
