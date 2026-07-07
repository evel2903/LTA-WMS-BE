import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IInventoryDimensionRepository,
  InventoryDimensionListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryDimensionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryDimensionOrmMapper';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';

@Injectable()
export class InventoryDimensionRepository implements IInventoryDimensionRepository {
  constructor(
    @InjectRepository(InventoryDimensionOrmEntity)
    private readonly inventoryDimensions: Repository<InventoryDimensionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<InventoryDimensionEntity | null> {
    const entity = await this.inventoryDimensions.findOne({ where: { Id: id } });
    return entity ? InventoryDimensionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByHash(dimensionKeyHash: string, manager?: EntityManager): Promise<InventoryDimensionEntity | null> {
    const repository = manager ? manager.getRepository(InventoryDimensionOrmEntity) : this.inventoryDimensions;
    const entity = await repository.findOne({ where: { DimensionKeyHash: dimensionKeyHash } });
    return entity ? InventoryDimensionOrmMapper.ToDomain(entity) : null;
  }

  public async FindOrCreateByHashForUpdate(
    dimension: InventoryDimensionEntity,
    manager: EntityManager,
  ): Promise<InventoryDimensionEntity> {
    const repo = manager.getRepository(InventoryDimensionOrmEntity);
    await repo
      .createQueryBuilder()
      .insert()
      .values({
        Id: dimension.Id,
        OwnerId: dimension.OwnerId,
        SkuId: dimension.SkuId,
        WarehouseId: dimension.WarehouseId,
        LocationId: dimension.LocationId,
        InventoryStatusId: dimension.InventoryStatusId,
        DimensionKeyHash: dimension.DimensionKeyHash,
        UomId: dimension.UomId,
        LpnCode: dimension.LpnCode,
        LotNumber: dimension.LotNumber,
        ExpiryDate: dimension.ExpiryDate,
        SerialNumber: dimension.SerialNumber,
        ProductionDate: dimension.ProductionDate,
        CountryOfOrigin: dimension.CountryOfOrigin,
        CustomsStatus: dimension.CustomsStatus,
        SourceSystem: dimension.SourceSystem,
        ReferenceId: dimension.ReferenceId,
        CreatedAt: dimension.CreatedAt,
        UpdatedAt: dimension.UpdatedAt,
        CreatedBy: dimension.CreatedBy,
        UpdatedBy: dimension.UpdatedBy,
      })
      .orIgnore()
      .execute();
    const entity = await repo
      .createQueryBuilder('dimension')
      .setLock('pessimistic_write')
      .where('dimension.dimension_key_hash = :dimensionKeyHash', {
        dimensionKeyHash: dimension.DimensionKeyHash,
      })
      .getOne();
    if (!entity) {
      throw new ConflictException('Inventory dimension could not be locked after upsert');
    }
    return InventoryDimensionOrmMapper.ToDomain(entity);
  }

  public async Create(dimension: InventoryDimensionEntity, manager?: EntityManager): Promise<InventoryDimensionEntity> {
    const repo = manager ? manager.getRepository(InventoryDimensionOrmEntity) : this.inventoryDimensions;
    try {
      const created = await repo.save(InventoryDimensionOrmMapper.ToOrm(dimension));
      return InventoryDimensionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: InventoryDimensionListFilter = {},
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<InventoryDimensionOrmEntity> = {};
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.LocationId) where.LocationId = filter.LocationId;
    if (filter.InventoryStatusId) where.InventoryStatusId = filter.InventoryStatusId;
    if (filter.UomId !== undefined) where.UomId = filter.UomId === null ? IsNull() : filter.UomId;
    if (filter.SerialNumber) where.SerialNumber = filter.SerialNumber;

    const [items, total] = await this.inventoryDimensions.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(InventoryDimensionOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Inventory dimension unique constraint violated');
    }
  }
}
