import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  ILocationProfileRepository,
  LocationProfileListFilter,
} from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationProfileOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/LocationProfileOrmMapper';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';

@Injectable()
export class LocationProfileRepository implements ILocationProfileRepository {
  constructor(
    @InjectRepository(LocationProfileOrmEntity)
    private readonly locationProfiles: Repository<LocationProfileOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<LocationProfileEntity | null> {
    const entity = await this.locationProfiles.findOne({ where: { Id: id } });
    return entity ? LocationProfileOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(profileCode: string): Promise<LocationProfileEntity | null> {
    const entity = await this.locationProfiles.findOne({ where: { ProfileCode: profileCode } });
    return entity ? LocationProfileOrmMapper.ToDomain(entity) : null;
  }

  public async Create(profile: LocationProfileEntity, manager?: EntityManager): Promise<LocationProfileEntity> {
    const repo = manager ? manager.getRepository(LocationProfileOrmEntity) : this.locationProfiles;
    try {
      const created = await repo.save(LocationProfileOrmMapper.ToOrm(profile));
      return LocationProfileOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(profile: LocationProfileEntity, manager?: EntityManager): Promise<LocationProfileEntity> {
    const repo = manager ? manager.getRepository(LocationProfileOrmEntity) : this.locationProfiles;
    try {
      const updated = await repo.save(LocationProfileOrmMapper.ToOrm(profile));
      return LocationProfileOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: LocationProfileListFilter = {},
  ): Promise<{ Items: LocationProfileEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<LocationProfileOrmEntity> = {};
    if (filter.Status) where.Status = filter.Status;
    if (filter.LocationType) where.LocationType = filter.LocationType;
    if (filter.ProfileCode) where.ProfileCode = filter.ProfileCode;

    const [items, total] = await this.locationProfiles.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(LocationProfileOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Location profile code already exists');
    }
  }
}
