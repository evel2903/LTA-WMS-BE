import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EscapeLikePattern } from '@common/Helpers/SqlLikeEscape';
import { IUomRepository, UomListFilter } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { UomOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/UomOrmMapper';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

@Injectable()
export class UomRepository implements IUomRepository {
  constructor(
    @InjectRepository(UomOrmEntity)
    private readonly uoms: Repository<UomOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<UomEntity | null> {
    const entity = await this.uoms.findOne({ where: { Id: id } });
    return entity ? UomOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(uomCode: string): Promise<UomEntity | null> {
    const entity = await this.uoms.findOne({ where: { UomCode: uomCode } });
    return entity ? UomOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCodes(uomCodes: string[]): Promise<UomEntity[]> {
    if (uomCodes.length === 0) return [];
    const entities = await this.uoms.find({ where: { UomCode: In(uomCodes) } });
    return entities.map(UomOrmMapper.ToDomain);
  }

  public async Create(uom: UomEntity, manager?: EntityManager): Promise<UomEntity> {
    const repo = manager ? manager.getRepository(UomOrmEntity) : this.uoms;
    try {
      const created = await repo.save(UomOrmMapper.ToOrm(uom));
      return UomOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(uom: UomEntity, manager?: EntityManager): Promise<UomEntity> {
    const repo = manager ? manager.getRepository(UomOrmEntity) : this.uoms;
    try {
      const updated = await repo.save(UomOrmMapper.ToOrm(uom));
      return UomOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: UomListFilter = {},
  ): Promise<{ Items: UomEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<UomOrmEntity> = {};
    if (filter.UomCode) where.UomCode = filter.UomCode;
    if (filter.UomName) where.UomName = filter.UomName;
    if (filter.UomType) where.UomType = filter.UomType;
    if (filter.Status) where.Status = filter.Status;
    const searchText = filter.Search?.trim() || null;
    const searchPattern = searchText ? `%${EscapeLikePattern(searchText)}%` : null;
    const scopedWhere: FindOptionsWhere<UomOrmEntity> | FindOptionsWhere<UomOrmEntity>[] = searchPattern
      ? [
          ...(filter.UomCode
            ? filter.UomCode.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, UomCode: ILike(searchPattern) }]),
          ...(filter.UomName
            ? filter.UomName.toLowerCase().includes(searchText!.toLowerCase())
              ? [{ ...where }]
              : []
            : [{ ...where, UomName: ILike(searchPattern) }]),
        ]
      : where;
    if (Array.isArray(scopedWhere) && scopedWhere.length === 0) return { Items: [], TotalItems: 0 };

    const [items, total] = await this.uoms.findAndCount({
      where: scopedWhere,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(UomOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('UOM code already exists');
    }
  }
}
