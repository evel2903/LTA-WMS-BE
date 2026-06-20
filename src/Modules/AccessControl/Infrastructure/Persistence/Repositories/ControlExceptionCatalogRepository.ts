import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { IControlExceptionCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalogRepository';
import { ControlExceptionCatalogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/ControlExceptionCatalogOrmMapper';
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';

@Injectable()
export class ControlExceptionCatalogRepository implements IControlExceptionCatalogRepository {
  constructor(
    @InjectRepository(ControlExceptionCatalogOrmEntity)
    private readonly catalog: Repository<ControlExceptionCatalogOrmEntity>,
  ) {}

  public async FindByCode(code: string): Promise<ControlExceptionCatalogEntity | null> {
    const entity = await this.catalog.findOne({ where: { Code: code } });
    return entity ? ControlExceptionCatalogOrmMapper.ToDomain(entity) : null;
  }

  public async List(): Promise<ControlExceptionCatalogEntity[]> {
    const entities = await this.catalog.find({ order: { Code: 'ASC' } });
    return entities.map(ControlExceptionCatalogOrmMapper.ToDomain);
  }

  /** Idempotent: existing row (matched by Code) keeps its Id/CreatedAt; fields updated in place. */
  public async Upsert(entity: ControlExceptionCatalogEntity): Promise<ControlExceptionCatalogEntity> {
    const existing = await this.catalog.findOne({ where: { Code: entity.Code } });
    const orm = ControlExceptionCatalogOrmMapper.ToOrm(entity);
    if (existing) {
      orm.Id = existing.Id;
      orm.CreatedAt = existing.CreatedAt;
    }
    try {
      const saved = await this.catalog.save(orm);
      return ControlExceptionCatalogOrmMapper.ToDomain(saved);
    } catch (error) {
      // Concurrent seed lost the find-then-insert race on UNIQUE(code): re-read and update in place.
      if ((error as { code?: string }).code === '23505') {
        const current = await this.catalog.findOne({ where: { Code: entity.Code } });
        if (current) {
          orm.Id = current.Id;
          orm.CreatedAt = current.CreatedAt;
          const saved = await this.catalog.save(orm);
          return ControlExceptionCatalogOrmMapper.ToDomain(saved);
        }
      }
      throw error;
    }
  }
}
