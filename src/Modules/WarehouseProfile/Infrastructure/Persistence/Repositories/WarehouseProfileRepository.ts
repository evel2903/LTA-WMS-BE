import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EscapeLikePattern } from '@common/Helpers/SqlLikeEscape';
import {
  IWarehouseProfileRepository,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
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

  public async Create(profile: WarehouseProfileEntity, manager?: EntityManager): Promise<WarehouseProfileEntity> {
    const repo = manager ? manager.getRepository(WarehouseProfileOrmEntity) : this.profiles;
    try {
      const created = await repo.save(WarehouseProfileOrmMapper.ToOrm(profile));
      return WarehouseProfileOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(profile: WarehouseProfileEntity, manager?: EntityManager): Promise<WarehouseProfileEntity> {
    const repo = manager ? manager.getRepository(WarehouseProfileOrmEntity) : this.profiles;
    try {
      const updated = await repo.save(WarehouseProfileOrmMapper.ToOrm(profile));
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

    const searchPattern = filter.Search?.trim() ? `%${EscapeLikePattern(filter.Search.trim())}%` : null;
    const scopedWhere = searchPattern
      ? [
          { ...where, ProfileCode: ILike(searchPattern) },
          { ...where, ProfileName: ILike(searchPattern) },
        ]
      : where;

    const [items, total] = await this.profiles.findAndCount({
      where: scopedWhere,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(WarehouseProfileOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  public async ListActiveByScope(evaluatedAt: Date): Promise<WarehouseProfileEntity[]> {
    const activeWindow: FindOptionsWhere<WarehouseProfileOrmEntity> = {
      Status: WarehouseProfileStatus.Active,
      EffectiveFrom: LessThanOrEqual(evaluatedAt),
    };

    const items = await this.profiles.find({
      where: [
        { ...activeWindow, EffectiveTo: IsNull() },
        { ...activeWindow, EffectiveTo: MoreThan(evaluatedAt) },
      ],
      order: { Version: 'DESC', EffectiveFrom: 'DESC' },
    });

    return items.map(WarehouseProfileOrmMapper.ToDomain);
  }

  public async FindActiveOverlapping(
    scopeKey: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeProfileId: string,
  ): Promise<WarehouseProfileEntity[]> {
    // Overlap of half-open windows [from, to): candidate.from < (to ?? +inf) AND (candidate.to ?? +inf) > from.
    // candidate.from < to is only constrained when `to` is finite (null = +inf = no upper bound).
    const base: FindOptionsWhere<WarehouseProfileOrmEntity> = {
      Status: WarehouseProfileStatus.Active,
      ScopeKey: scopeKey,
      Id: Not(excludeProfileId),
    };
    if (effectiveTo !== null) {
      base.EffectiveFrom = LessThan(effectiveTo);
    }

    const items = await this.profiles.find({
      where: [
        // candidate.to = null -> +inf, always satisfies (.to > from).
        { ...base, EffectiveTo: IsNull() },
        // candidate.to finite -> must be strictly greater than from.
        { ...base, EffectiveTo: MoreThan(effectiveFrom) },
      ],
    });

    return items.map(WarehouseProfileOrmMapper.ToDomain);
  }

  public async RunInTransaction<T>(
    work: (txRepository: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    // architecture 5.2 / 4.7: open a real DB transaction (DataSource.transaction) and hand the unit
    // of work a repository bound to that transaction's EntityManager, so the activation overlap
    // re-check and the status write are atomic against concurrent activations at the same scope.
    return this.profiles.manager.transaction(async (manager) => {
      const txRepository = new WarehouseProfileRepository(manager.getRepository(WarehouseProfileOrmEntity));
      return work(txRepository, manager);
    });
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Warehouse profile code already exists');
    }
  }
}
