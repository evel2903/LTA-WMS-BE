import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IUomConversionRepository,
  UomConversionListFilter,
} from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { UomConversionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/UomConversionOrmMapper';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';

@Injectable()
export class UomConversionRepository implements IUomConversionRepository {
  constructor(
    @InjectRepository(UomConversionOrmEntity)
    private readonly uomConversions: Repository<UomConversionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<UomConversionEntity | null> {
    const entity = await this.uomConversions.findOne({ where: { Id: id } });
    return entity ? UomConversionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByUniqueKey(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    effectiveFrom: Date,
  ): Promise<UomConversionEntity | null> {
    const entity = await this.uomConversions.findOne({
      where: { SkuId: skuId, FromUomId: fromUomId, ToUomId: toUomId, EffectiveFrom: effectiveFrom },
    });
    return entity ? UomConversionOrmMapper.ToDomain(entity) : null;
  }

  public async FindActiveOverlap(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<UomConversionEntity | null> {
    const targetEnd = effectiveTo ?? new Date('9999-12-31T23:59:59.999Z');
    let query = this.uomConversions
      .createQueryBuilder('conversion')
      .where('conversion.sku_id = :skuId', { skuId })
      .andWhere('conversion.from_uom_id = :fromUomId', { fromUomId })
      .andWhere('conversion.to_uom_id = :toUomId', { toUomId })
      .andWhere('conversion.status = :status', { status: MasterDataStatus.Active })
      .andWhere('conversion.effective_from <= :targetEnd', { targetEnd })
      .andWhere('(conversion.effective_to IS NULL OR conversion.effective_to >= :effectiveFrom)', { effectiveFrom });

    if (excludeId) {
      query = query.andWhere('conversion.id <> :excludeId', { excludeId });
    }

    const entity = await query.getOne();
    return entity ? UomConversionOrmMapper.ToDomain(entity) : null;
  }

  public async Create(uomConversion: UomConversionEntity, manager?: EntityManager): Promise<UomConversionEntity> {
    const repo = manager ? manager.getRepository(UomConversionOrmEntity) : this.uomConversions;
    try {
      const created = await repo.save(UomConversionOrmMapper.ToOrm(uomConversion));
      return UomConversionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(uomConversion: UomConversionEntity, manager?: EntityManager): Promise<UomConversionEntity> {
    const repo = manager ? manager.getRepository(UomConversionOrmEntity) : this.uomConversions;
    try {
      const updated = await repo.save(UomConversionOrmMapper.ToOrm(uomConversion));
      return UomConversionOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: UomConversionListFilter = {},
  ): Promise<{ Items: UomConversionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<UomConversionOrmEntity> = {};
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.FromUomId) where.FromUomId = filter.FromUomId;
    if (filter.ToUomId) where.ToUomId = filter.ToUomId;
    if (filter.Status) where.Status = filter.Status;
    if (filter.EffectiveFrom) where.EffectiveFrom = filter.EffectiveFrom;

    const [items, total] = await this.uomConversions.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(UomConversionOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('UOM conversion unique constraint violated');
    }
    if ((error as { code?: string }).code === '23P01') {
      throw new ConflictException('Active UOM conversion effective window overlaps existing conversion');
    }
  }
}
