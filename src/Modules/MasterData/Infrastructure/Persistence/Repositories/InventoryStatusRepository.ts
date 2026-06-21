import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import {
  IInventoryStatusRepository,
  InventoryStatusListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { InventoryStatusOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryStatusOrmMapper';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';

@Injectable()
export class InventoryStatusRepository implements IInventoryStatusRepository {
  constructor(
    @InjectRepository(InventoryStatusOrmEntity)
    private readonly inventoryStatuses: Repository<InventoryStatusOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<InventoryStatusEntity | null> {
    const entity = await this.inventoryStatuses.findOne({ where: { Id: id } });
    return entity ? InventoryStatusOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(statusCode: string): Promise<InventoryStatusEntity | null> {
    const entity = await this.inventoryStatuses.findOne({ where: { StatusCode: statusCode } });
    return entity ? InventoryStatusOrmMapper.ToDomain(entity) : null;
  }

  public async List(
    skip: number,
    take: number,
    filter: InventoryStatusListFilter = {},
  ): Promise<{ Items: InventoryStatusEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<InventoryStatusOrmEntity> = {};
    if (filter.StatusCode) where.StatusCode = filter.StatusCode;
    if (filter.StageGroup) where.StageGroup = filter.StageGroup;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.inventoryStatuses.findAndCount({
      where,
      order: { SortOrder: 'ASC' },
      skip,
      take,
    });

    return { Items: items.map(InventoryStatusOrmMapper.ToDomain), TotalItems: total };
  }

  public async Update(status: InventoryStatusEntity, manager?: EntityManager): Promise<InventoryStatusEntity> {
    const repo = manager ? manager.getRepository(InventoryStatusOrmEntity) : this.inventoryStatuses;
    const saved = await repo.save(InventoryStatusOrmMapper.ToOrm(status));
    return InventoryStatusOrmMapper.ToDomain(saved);
  }
}
