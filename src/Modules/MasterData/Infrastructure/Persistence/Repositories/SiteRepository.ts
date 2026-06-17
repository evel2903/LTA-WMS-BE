import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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
    const created = await this.sites.save(SiteOrmMapper.ToOrm(site));
    return SiteOrmMapper.ToDomain(created);
  }

  public async Update(site: SiteEntity): Promise<SiteEntity> {
    const updated = await this.sites.save(SiteOrmMapper.ToOrm(site));
    return SiteOrmMapper.ToDomain(updated);
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
}
