import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  AllocationInventoryCandidate,
  AllocationInventoryCandidateFilter,
  IAllocationInventoryRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationInventoryRepository';
import { InventoryBalanceOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryBalanceOrmMapper';
import { InventoryDimensionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/InventoryDimensionOrmMapper';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';

@Injectable()
export class AllocationInventoryRepository implements IAllocationInventoryRepository {
  constructor(
    @InjectRepository(InventoryBalanceOrmEntity)
    private readonly balances: Repository<InventoryBalanceOrmEntity>,
  ) {}

  public async ListCandidates(
    filter: AllocationInventoryCandidateFilter,
    manager?: EntityManager,
  ): Promise<AllocationInventoryCandidate[]> {
    const repo = manager ? manager.getRepository(InventoryBalanceOrmEntity) : this.balances;
    const entities = await repo
      .createQueryBuilder('balance')
      .innerJoinAndSelect('balance.Dimension', 'dimension')
      .innerJoinAndSelect('dimension.InventoryStatus', 'status')
      .where('dimension.warehouse_id = :warehouseId', { warehouseId: filter.WarehouseId })
      .andWhere('dimension.owner_id = :ownerId', { ownerId: filter.OwnerId })
      .andWhere('dimension.sku_id = :skuId', { skuId: filter.SkuId })
      .andWhere('dimension.uom_id = :uomId', { uomId: filter.UomId })
      .andWhere('status.allows_allocation = true')
      .andWhere('status.is_terminal = false')
      .andWhere('status.is_milestone = false')
      .andWhere('balance.qty_available > 0')
      .orderBy('dimension.expiry_date', 'ASC', 'NULLS LAST')
      .addOrderBy('dimension.production_date', 'ASC', 'NULLS LAST')
      .addOrderBy('balance.created_at', 'ASC')
      .getMany();

    return entities.map((entity) => ({
      Balance: InventoryBalanceOrmMapper.ToDomain(entity),
      Dimension: InventoryDimensionOrmMapper.ToDomain(entity.Dimension),
      InventoryStatusCode: entity.Dimension.InventoryStatus.StatusCode,
    }));
  }
}
