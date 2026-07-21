import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EscapeLikePattern } from '@common/Helpers/SqlLikeEscape';
import {
  IPartnerRepository,
  PartnerListFilter,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { PartnerOrmMapper } from '@modules/PartnerMaster/Infrastructure/Mappers/PartnerOrmMapper';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';

@Injectable()
export class PartnerRepository implements IPartnerRepository {
  constructor(
    @InjectRepository(PartnerOrmEntity)
    private readonly partners: Repository<PartnerOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<PartnerEntity | null> {
    const entity = await this.partners.findOne({ where: { Id: id } });
    return entity ? PartnerOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(partnerCode: string): Promise<PartnerEntity | null> {
    const entity = await this.partners.findOne({ where: { PartnerCode: partnerCode } });
    return entity ? PartnerOrmMapper.ToDomain(entity) : null;
  }

  public async FindByExternalReference(
    partnerType: PartnerType,
    sourceSystem: string,
    externalReference: string,
  ): Promise<PartnerEntity | null> {
    const entity = await this.partners.findOne({
      where: {
        PartnerType: partnerType,
        SourceSystem: sourceSystem,
        ExternalReference: externalReference,
      },
    });
    return entity ? PartnerOrmMapper.ToDomain(entity) : null;
  }

  public async Create(partner: PartnerEntity, manager?: EntityManager): Promise<PartnerEntity> {
    const repo = manager ? manager.getRepository(PartnerOrmEntity) : this.partners;
    try {
      const created = await repo.save(PartnerOrmMapper.ToOrm(partner));
      return PartnerOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(partner: PartnerEntity, manager?: EntityManager): Promise<PartnerEntity> {
    const repo = manager ? manager.getRepository(PartnerOrmEntity) : this.partners;
    try {
      const updated = await repo.save(PartnerOrmMapper.ToOrm(partner));
      return PartnerOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: PartnerListFilter = {},
  ): Promise<{ Items: PartnerEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<PartnerOrmEntity> = {};
    if (filter.PartnerType) where.PartnerType = filter.PartnerType;
    if (filter.Status) where.Status = filter.Status;
    if (filter.PartnerCode) where.PartnerCode = filter.PartnerCode;
    if (filter.PartnerName) where.PartnerName = filter.PartnerName;
    if (filter.SourceSystem) where.SourceSystem = filter.SourceSystem;
    if (filter.ExternalReference) where.ExternalReference = filter.ExternalReference;

    const searchText = filter.Search?.trim() || null;
    const searchPattern = searchText ? `%${EscapeLikePattern(searchText)}%` : null;
    const scopedWhere: FindOptionsWhere<PartnerOrmEntity> | FindOptionsWhere<PartnerOrmEntity>[] = searchPattern
      ? [
          ...(filter.PartnerCode
            ? filter.PartnerCode.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, PartnerCode: ILike(searchPattern) }]),
          ...(filter.PartnerName
            ? filter.PartnerName.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, PartnerName: ILike(searchPattern) }]),
        ]
      : where;
    if (Array.isArray(scopedWhere) && scopedWhere.length === 0) return { Items: [], TotalItems: 0 };

    const [items, total] = await this.partners.findAndCount({
      where: scopedWhere,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(PartnerOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Partner unique constraint violated');
    }
  }
}
