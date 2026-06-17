import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  ILocationRepository,
  LocationListFilter,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/LocationOrmMapper';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';

@Injectable()
export class LocationRepository implements ILocationRepository {
  constructor(
    @InjectRepository(LocationOrmEntity)
    private readonly locations: Repository<LocationOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<LocationEntity | null> {
    const entity = await this.locations.findOne({ where: { Id: id } });
    return entity ? LocationOrmMapper.ToDomain(entity) : null;
  }

  public async FindByWarehouseAndCode(warehouseId: string, locationCode: string): Promise<LocationEntity | null> {
    const entity = await this.locations.findOne({ where: { WarehouseId: warehouseId, LocationCode: locationCode } });
    return entity ? LocationOrmMapper.ToDomain(entity) : null;
  }

  public async Create(location: LocationEntity): Promise<LocationEntity> {
    try {
      const created = await this.locations.save(LocationOrmMapper.ToOrm(location));
      return LocationOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(location: LocationEntity): Promise<LocationEntity> {
    try {
      const updated = await this.locations.save(LocationOrmMapper.ToOrm(location));
      return LocationOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: LocationListFilter = {},
  ): Promise<{ Items: LocationEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<LocationOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.ZoneId) where.ZoneId = filter.ZoneId;
    if (filter.ParentLocationId !== undefined) {
      where.ParentLocationId = filter.ParentLocationId === null ? IsNull() : filter.ParentLocationId;
    }
    if (filter.LocationStatus) where.LocationStatus = filter.LocationStatus;
    if (filter.LocationType) where.LocationType = filter.LocationType;
    if (filter.LocationProfileId) where.LocationProfileId = filter.LocationProfileId;
    if (filter.LocationCode) where.LocationCode = filter.LocationCode;

    const [items, total] = await this.locations.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(LocationOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  public async ListForTree(warehouseId: string, zoneId?: string): Promise<LocationEntity[]> {
    const where: FindOptionsWhere<LocationOrmEntity> = { WarehouseId: warehouseId };
    if (zoneId) where.ZoneId = zoneId;

    const items = await this.locations.find({
      where,
      order: { PickSequence: 'ASC', PutawaySequence: 'ASC', LocationCode: 'ASC' },
    });

    return items.map(LocationOrmMapper.ToDomain);
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Location code already exists in warehouse');
    }
  }
}
