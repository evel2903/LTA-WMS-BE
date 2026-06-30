import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Raw, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IWarehouseTypeRepository,
  WarehouseTypeListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { NormalizeWarehouseTypeCode } from '@modules/MasterData/Domain/Services/WarehouseTypeCodePolicy';
import { WarehouseTypeOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/WarehouseTypeOrmMapper';
import { WarehouseTypeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseTypeOrmEntity';

@Injectable()
export class WarehouseTypeRepository implements IWarehouseTypeRepository {
  constructor(
    @InjectRepository(WarehouseTypeOrmEntity)
    private readonly warehouseTypes: Repository<WarehouseTypeOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<WarehouseTypeEntity | null> {
    const entity = await this.warehouseTypes.findOne({ where: { Id: id } });
    return entity ? WarehouseTypeOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(warehouseTypeCode: string): Promise<WarehouseTypeEntity | null> {
    const normalizedCode = NormalizeWarehouseTypeCode(warehouseTypeCode);
    const entity = await this.warehouseTypes.findOne({
      where: {
        WarehouseTypeCode: Raw((alias) => `UPPER(TRIM(${alias})) = :warehouseTypeCode`, {
          warehouseTypeCode: normalizedCode,
        }),
      },
    });
    return entity ? WarehouseTypeOrmMapper.ToDomain(entity) : null;
  }

  public async Create(warehouseType: WarehouseTypeEntity, manager?: EntityManager): Promise<WarehouseTypeEntity> {
    const repo = manager ? manager.getRepository(WarehouseTypeOrmEntity) : this.warehouseTypes;
    try {
      const created = await repo.save(WarehouseTypeOrmMapper.ToOrm(warehouseType));
      return WarehouseTypeOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(warehouseType: WarehouseTypeEntity, manager?: EntityManager): Promise<WarehouseTypeEntity> {
    const repo = manager ? manager.getRepository(WarehouseTypeOrmEntity) : this.warehouseTypes;
    try {
      const updated = await repo.save(WarehouseTypeOrmMapper.ToOrm(warehouseType));
      return WarehouseTypeOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseTypeListFilter = {},
  ): Promise<{ Items: WarehouseTypeEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<WarehouseTypeOrmEntity> = {};
    if (filter.WarehouseTypeCode) {
      const normalizedCode = NormalizeWarehouseTypeCode(filter.WarehouseTypeCode);
      where.WarehouseTypeCode = Raw((alias) => `UPPER(TRIM(${alias})) = :warehouseTypeCode`, {
        warehouseTypeCode: normalizedCode,
      });
    }
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.warehouseTypes.findAndCount({
      where,
      order: { WarehouseTypeCode: 'ASC' },
      skip,
      take,
    });

    return { Items: items.map(WarehouseTypeOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Warehouse type code already exists');
    }
  }
}
