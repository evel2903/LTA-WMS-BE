import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IItemCoverageRepository,
  ItemCoverageListFilter,
} from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { ItemCoverageOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/ItemCoverageOrmMapper';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';

@Injectable()
export class ItemCoverageRepository implements IItemCoverageRepository {
  constructor(
    @InjectRepository(ItemCoverageOrmEntity)
    private readonly itemCoverages: Repository<ItemCoverageOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<ItemCoverageEntity | null> {
    const entity = await this.itemCoverages.findOne({ where: { Id: id } });
    return entity ? ItemCoverageOrmMapper.ToDomain(entity) : null;
  }

  public async FindBySkuWarehouseOwner(
    skuId: string,
    warehouseId: string,
    ownerId: string | null,
  ): Promise<ItemCoverageEntity | null> {
    const entity = await this.itemCoverages.findOne({
      where: { SkuId: skuId, WarehouseId: warehouseId, OwnerId: ownerId === null ? IsNull() : ownerId },
    });
    return entity ? ItemCoverageOrmMapper.ToDomain(entity) : null;
  }

  public async Create(itemCoverage: ItemCoverageEntity): Promise<ItemCoverageEntity> {
    try {
      const created = await this.itemCoverages.save(ItemCoverageOrmMapper.ToOrm(itemCoverage));
      return ItemCoverageOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(itemCoverage: ItemCoverageEntity): Promise<ItemCoverageEntity> {
    try {
      const updated = await this.itemCoverages.save(ItemCoverageOrmMapper.ToOrm(itemCoverage));
      return ItemCoverageOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: ItemCoverageListFilter = {},
  ): Promise<{ Items: ItemCoverageEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<ItemCoverageOrmEntity> = {};
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId !== undefined) where.OwnerId = filter.OwnerId === null ? IsNull() : filter.OwnerId;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.itemCoverages.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(ItemCoverageOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Item coverage unique constraint violated');
    }
  }
}
