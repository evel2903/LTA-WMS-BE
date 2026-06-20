import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationRuleCatalogEntity } from '@modules/AccessControl/Domain/Entities/ValidationRuleCatalogEntity';
import { IValidationRuleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IValidationRuleCatalogRepository';
import { ValidationRuleCatalogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/ValidationRuleCatalogOrmMapper';
import { ValidationRuleCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ValidationRuleCatalogOrmEntity';

@Injectable()
export class ValidationRuleCatalogRepository implements IValidationRuleCatalogRepository {
  constructor(
    @InjectRepository(ValidationRuleCatalogOrmEntity)
    private readonly catalog: Repository<ValidationRuleCatalogOrmEntity>,
  ) {}

  public async FindByCode(code: string): Promise<ValidationRuleCatalogEntity | null> {
    const entity = await this.catalog.findOne({ where: { Code: code } });
    return entity ? ValidationRuleCatalogOrmMapper.ToDomain(entity) : null;
  }

  public async List(): Promise<ValidationRuleCatalogEntity[]> {
    const entities = await this.catalog.find({ order: { Code: 'ASC' } });
    return entities.map(ValidationRuleCatalogOrmMapper.ToDomain);
  }

  /** Idempotent: existing row (matched by Code) keeps its Id/CreatedAt; fields updated in place. */
  public async Upsert(entity: ValidationRuleCatalogEntity): Promise<ValidationRuleCatalogEntity> {
    const existing = await this.catalog.findOne({ where: { Code: entity.Code } });
    const orm = ValidationRuleCatalogOrmMapper.ToOrm(entity);
    if (existing) {
      orm.Id = existing.Id;
      orm.CreatedAt = existing.CreatedAt;
    }
    const saved = await this.catalog.save(orm);
    return ValidationRuleCatalogOrmMapper.ToDomain(saved);
  }
}
