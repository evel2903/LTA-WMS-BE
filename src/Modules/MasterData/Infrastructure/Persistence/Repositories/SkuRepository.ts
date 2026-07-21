import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EscapeLikePattern } from '@common/Helpers/SqlLikeEscape';
import { ISkuRepository, SkuListFilter } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/SkuOrmMapper';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';

@Injectable()
export class SkuRepository implements ISkuRepository {
  constructor(
    @InjectRepository(SkuOrmEntity)
    private readonly skus: Repository<SkuOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<SkuEntity | null> {
    const entity = await this.skus.findOne({ where: { Id: id } });
    return entity ? SkuOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(skuCode: string): Promise<SkuEntity | null> {
    const entity = await this.skus.findOne({ where: { SkuCode: skuCode } });
    return entity ? SkuOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCodes(skuCodes: string[]): Promise<SkuEntity[]> {
    if (skuCodes.length === 0) return [];
    const entities = await this.skus.find({ where: { SkuCode: In(skuCodes) } });
    return entities.map(SkuOrmMapper.ToDomain);
  }

  public async Create(sku: SkuEntity, manager?: EntityManager): Promise<SkuEntity> {
    const repo = manager ? manager.getRepository(SkuOrmEntity) : this.skus;
    try {
      const created = await repo.save(SkuOrmMapper.ToOrm(sku));
      return SkuOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(sku: SkuEntity, manager?: EntityManager): Promise<SkuEntity> {
    const repo = manager ? manager.getRepository(SkuOrmEntity) : this.skus;
    try {
      const updated = await repo.save(SkuOrmMapper.ToOrm(sku));
      return SkuOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: SkuListFilter = {},
  ): Promise<{ Items: SkuEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<SkuOrmEntity> = {};
    if (filter.SkuCode) where.SkuCode = filter.SkuCode;
    if (filter.SkuName) where.SkuName = filter.SkuName;
    if (filter.DefaultOwnerId) where.DefaultOwnerId = filter.DefaultOwnerId;
    if (filter.ItemClass) where.ItemClass = filter.ItemClass;
    if (filter.ItemStatus) where.ItemStatus = filter.ItemStatus;

    const searchText = filter.Search?.trim() || null;
    const searchPattern = searchText ? `%${EscapeLikePattern(searchText)}%` : null;
    const scopedWhere: FindOptionsWhere<SkuOrmEntity> | FindOptionsWhere<SkuOrmEntity>[] = searchPattern
      ? [
          ...(filter.SkuCode
            ? filter.SkuCode.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, SkuCode: ILike(searchPattern) }]),
          ...(filter.SkuName
            ? filter.SkuName.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, SkuName: ILike(searchPattern) }]),
        ]
      : where;
    if (Array.isArray(scopedWhere) && scopedWhere.length === 0) return { Items: [], TotalItems: 0 };

    const [items, total] = await this.skus.findAndCount({
      where: scopedWhere,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(SkuOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('SKU code already exists');
    }
  }
}
