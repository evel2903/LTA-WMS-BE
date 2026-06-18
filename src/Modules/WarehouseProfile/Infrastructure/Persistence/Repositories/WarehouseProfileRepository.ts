import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IWarehouseProfileRepository,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileOrmMapper';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';

@Injectable()
export class WarehouseProfileRepository implements IWarehouseProfileRepository {
  constructor(
    @InjectRepository(WarehouseProfileOrmEntity)
    private readonly profiles: Repository<WarehouseProfileOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    const entity = await this.profiles.findOne({ where: { Id: id } });
    return entity ? WarehouseProfileOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(profileCode: string): Promise<WarehouseProfileEntity | null> {
    const entity = await this.profiles.findOne({ where: { ProfileCode: profileCode } });
    return entity ? WarehouseProfileOrmMapper.ToDomain(entity) : null;
  }

  public async Create(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    try {
      const created = await this.profiles.save(WarehouseProfileOrmMapper.ToOrm(profile));
      return WarehouseProfileOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    try {
      const updated = await this.profiles.save(WarehouseProfileOrmMapper.ToOrm(profile));
      return WarehouseProfileOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseProfileListFilter = {},
  ): Promise<{ Items: WarehouseProfileEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<WarehouseProfileOrmEntity> = {};
    if (filter.Status) where.Status = filter.Status;
    if (filter.WarehouseTypeCode) where.WarehouseTypeCode = filter.WarehouseTypeCode;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;

    const [items, total] = await this.profiles.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(WarehouseProfileOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Warehouse profile code already exists');
    }
  }
}
