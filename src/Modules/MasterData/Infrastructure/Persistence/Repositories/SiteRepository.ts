import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { ISiteRepository, SiteListFilter } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { SiteOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/SiteOrmMapper';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';

@Injectable()
export class SiteRepository implements ISiteRepository {
  constructor(
    @InjectRepository(SiteOrmEntity)
    private readonly sites: Repository<SiteOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<SiteEntity | null> {
    const entity = await this.sites.findOne({ where: { Id: id } });
    return entity ? SiteOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(siteCode: string): Promise<SiteEntity | null> {
    const entity = await this.sites.findOne({ where: { SiteCode: siteCode } });
    return entity ? SiteOrmMapper.ToDomain(entity) : null;
  }

  public async Create(site: SiteEntity): Promise<SiteEntity> {
    try {
      const created = await this.sites.save(SiteOrmMapper.ToOrm(site));
      return SiteOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(site: SiteEntity): Promise<SiteEntity> {
    try {
      const updated = await this.sites.save(SiteOrmMapper.ToOrm(site));
      return SiteOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: SiteListFilter = {},
  ): Promise<{ Items: SiteEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<SiteOrmEntity> = {};
    if (filter.Status) where.Status = filter.Status;
    if (filter.SiteCode) where.SiteCode = filter.SiteCode;

    const [items, total] = await this.sites.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(SiteOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Site code already exists');
    }
  }
}
