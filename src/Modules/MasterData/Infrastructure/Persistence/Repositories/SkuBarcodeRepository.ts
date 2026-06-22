import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  ISkuBarcodeRepository,
  SkuBarcodeListFilter,
} from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { SkuBarcodeOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/SkuBarcodeOrmMapper';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';

@Injectable()
export class SkuBarcodeRepository implements ISkuBarcodeRepository {
  constructor(
    @InjectRepository(SkuBarcodeOrmEntity)
    private readonly skuBarcodes: Repository<SkuBarcodeOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<SkuBarcodeEntity | null> {
    const entity = await this.skuBarcodes.findOne({ where: { Id: id } });
    return entity ? SkuBarcodeOrmMapper.ToDomain(entity) : null;
  }

  public async FindByValueAndOwner(barcodeValue: string, ownerId: string | null): Promise<SkuBarcodeEntity | null> {
    const where: FindOptionsWhere<SkuBarcodeOrmEntity> = {
      BarcodeValue: barcodeValue,
      OwnerId: ownerId === null ? IsNull() : ownerId,
    };
    const entity = await this.skuBarcodes.findOne({ where });
    return entity ? SkuBarcodeOrmMapper.ToDomain(entity) : null;
  }

  public async FindCandidatesByValue(barcodeValue: string): Promise<SkuBarcodeEntity[]> {
    const entities = await this.skuBarcodes.find({
      where: { BarcodeValue: barcodeValue },
      order: { OwnerId: 'DESC', CreatedAt: 'DESC' },
    });
    return entities.map(SkuBarcodeOrmMapper.ToDomain);
  }

  public async Create(skuBarcode: SkuBarcodeEntity, manager?: EntityManager): Promise<SkuBarcodeEntity> {
    const repo = manager ? manager.getRepository(SkuBarcodeOrmEntity) : this.skuBarcodes;
    try {
      const created = await repo.save(SkuBarcodeOrmMapper.ToOrm(skuBarcode));
      return SkuBarcodeOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(skuBarcode: SkuBarcodeEntity, manager?: EntityManager): Promise<SkuBarcodeEntity> {
    const repo = manager ? manager.getRepository(SkuBarcodeOrmEntity) : this.skuBarcodes;
    try {
      const updated = await repo.save(SkuBarcodeOrmMapper.ToOrm(skuBarcode));
      return SkuBarcodeOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: SkuBarcodeListFilter = {},
  ): Promise<{ Items: SkuBarcodeEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<SkuBarcodeOrmEntity> = {};
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.OwnerId !== undefined) where.OwnerId = filter.OwnerId === null ? IsNull() : filter.OwnerId;
    if (filter.UomId) where.UomId = filter.UomId;
    if (filter.BarcodeValue) where.BarcodeValue = filter.BarcodeValue;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.skuBarcodes.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(SkuBarcodeOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('SKU barcode unique constraint violated');
    }
  }
}
