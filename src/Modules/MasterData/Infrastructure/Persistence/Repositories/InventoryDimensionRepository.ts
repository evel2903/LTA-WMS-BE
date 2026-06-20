import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IInventoryDimensionRepository,
  InventoryDimensionListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryDimensionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryDimensionOrmMapper';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';

@Injectable()
export class InventoryDimensionRepository implements IInventoryDimensionRepository {
  constructor(
    @InjectRepository(InventoryDimensionOrmEntity)
    private readonly inventoryDimensions: Repository<InventoryDimensionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<InventoryDimensionEntity | null> {
    const entity = await this.inventoryDimensions.findOne({ where: { Id: id } });
    return entity ? InventoryDimensionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByHash(dimensionKeyHash: string): Promise<InventoryDimensionEntity | null> {
    const entity = await this.inventoryDimensions.findOne({ where: { DimensionKeyHash: dimensionKeyHash } });
    return entity ? InventoryDimensionOrmMapper.ToDomain(entity) : null;
  }

  public async Create(dimension: InventoryDimensionEntity, manager?: EntityManager): Promise<InventoryDimensionEntity> {
    const repo = manager ? manager.getRepository(InventoryDimensionOrmEntity) : this.inventoryDimensions;
    try {
      const created = await repo.save(InventoryDimensionOrmMapper.ToOrm(dimension));
      return InventoryDimensionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: InventoryDimensionListFilter = {},
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<InventoryDimensionOrmEntity> = {};
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.LocationId) where.LocationId = filter.LocationId;
    if (filter.InventoryStatusId) where.InventoryStatusId = filter.InventoryStatusId;
    if (filter.UomId !== undefined) where.UomId = filter.UomId === null ? IsNull() : filter.UomId;

    const [items, total] = await this.inventoryDimensions.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(InventoryDimensionOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Inventory dimension unique constraint violated');
    }
  }
}
