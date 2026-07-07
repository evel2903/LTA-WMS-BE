import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IInventorySerialLookupRepository,
  InventorySerialLookupFilter,
  InventorySerialLookupRow,
} from '@modules/MasterData/Application/Interfaces/IInventorySerialLookupRepository';
import { InventoryBalanceOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryBalanceOrmMapper';
import { InventoryDimensionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryDimensionOrmMapper';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';

@Injectable()
export class InventorySerialLookupRepository implements IInventorySerialLookupRepository {
  constructor(
    @InjectRepository(InventoryBalanceOrmEntity)
    private readonly balances: Repository<InventoryBalanceOrmEntity>,
  ) {}

  public async List(
    skip: number,
    take: number,
    filter: InventorySerialLookupFilter,
  ): Promise<{ Items: InventorySerialLookupRow[]; TotalItems: number }> {
    let qb = this.balances
      .createQueryBuilder('balance')
      .innerJoinAndSelect('balance.Dimension', 'dimension')
      .innerJoinAndSelect('dimension.Sku', 'sku')
      .innerJoinAndSelect('dimension.Warehouse', 'warehouse')
      .innerJoinAndSelect('dimension.Location', 'location')
      .innerJoinAndSelect('dimension.InventoryStatus', 'status');

    const skuId = filter.SkuId?.trim();
    const warehouseId = filter.WarehouseId?.trim();
    const ownerId = filter.OwnerId?.trim();
    const serialNumber = filter.SerialNumber?.trim();
    const lotNumber = filter.LotNumber?.trim();

    if (skuId) qb = qb.andWhere('dimension.sku_id = :skuId', { skuId });
    if (warehouseId) qb = qb.andWhere('dimension.warehouse_id = :warehouseId', { warehouseId });
    if (ownerId) qb = qb.andWhere('dimension.owner_id = :ownerId', { ownerId });
    if (serialNumber) qb = qb.andWhere('dimension.serial_number = :serialNumber', { serialNumber });
    if (lotNumber) qb = qb.andWhere('dimension.lot_number = :lotNumber', { lotNumber });

    const [entities, totalItems] = await qb
      .orderBy('balance.created_at', 'DESC')
      .addOrderBy('balance.id', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const items = entities.map((entity) => ({
      Balance: InventoryBalanceOrmMapper.ToDomain(entity),
      Dimension: InventoryDimensionOrmMapper.ToDomain(entity.Dimension),
      SkuCode: entity.Dimension.Sku.SkuCode,
      WarehouseCode: entity.Dimension.Warehouse.WarehouseCode,
      LocationCode: entity.Dimension.Location.LocationCode,
      InventoryStatusCode: entity.Dimension.InventoryStatus.StatusCode,
    }));

    return { Items: items, TotalItems: totalItems };
  }
}
