import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IWarehouseRepository,
  WarehouseListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { WarehouseOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/WarehouseOrmMapper';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';

@Injectable()
export class WarehouseRepository implements IWarehouseRepository {
  constructor(
    @InjectRepository(WarehouseOrmEntity)
    private readonly warehouses: Repository<WarehouseOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<WarehouseEntity | null> {
    const entity = await this.warehouses.findOne({ where: { Id: id } });
    return entity ? WarehouseOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(warehouseCode: string): Promise<WarehouseEntity | null> {
    const entity = await this.warehouses.findOne({ where: { WarehouseCode: warehouseCode } });
    return entity ? WarehouseOrmMapper.ToDomain(entity) : null;
  }

  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    try {
      const created = await this.warehouses.save(WarehouseOrmMapper.ToOrm(warehouse));
      return WarehouseOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    try {
      const updated = await this.warehouses.save(WarehouseOrmMapper.ToOrm(warehouse));
      return WarehouseOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseListFilter = {},
  ): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<WarehouseOrmEntity> = {};
    if (filter.SiteId) where.SiteId = filter.SiteId;
    if (filter.Status) where.Status = filter.Status;
    if (filter.WarehouseCode) where.WarehouseCode = filter.WarehouseCode;

    const [items, total] = await this.warehouses.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(WarehouseOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Warehouse code already exists');
    }
  }
}
