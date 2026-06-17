import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { IZoneRepository, ZoneListFilter } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { ZoneOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/ZoneOrmMapper';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';

@Injectable()
export class ZoneRepository implements IZoneRepository {
  constructor(
    @InjectRepository(ZoneOrmEntity)
    private readonly zones: Repository<ZoneOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<ZoneEntity | null> {
    const entity = await this.zones.findOne({ where: { Id: id } });
    return entity ? ZoneOrmMapper.ToDomain(entity) : null;
  }

  public async FindByWarehouseAndCode(warehouseId: string, zoneCode: string): Promise<ZoneEntity | null> {
    const entity = await this.zones.findOne({ where: { WarehouseId: warehouseId, ZoneCode: zoneCode } });
    return entity ? ZoneOrmMapper.ToDomain(entity) : null;
  }

  public async Create(zone: ZoneEntity): Promise<ZoneEntity> {
    try {
      const created = await this.zones.save(ZoneOrmMapper.ToOrm(zone));
      return ZoneOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(zone: ZoneEntity): Promise<ZoneEntity> {
    try {
      const updated = await this.zones.save(ZoneOrmMapper.ToOrm(zone));
      return ZoneOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: ZoneListFilter = {},
  ): Promise<{ Items: ZoneEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<ZoneOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.Status) where.Status = filter.Status;
    if (filter.ZoneCode) where.ZoneCode = filter.ZoneCode;

    const [items, total] = await this.zones.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(ZoneOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Zone code already exists in warehouse');
    }
  }
}
