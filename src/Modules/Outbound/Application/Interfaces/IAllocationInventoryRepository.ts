import { EntityManager } from 'typeorm';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

export const ALLOCATION_INVENTORY_REPOSITORY = Symbol('ALLOCATION_INVENTORY_REPOSITORY');

export interface AllocationInventoryCandidateFilter {
  WarehouseId: string;
  OwnerId: string;
  SkuId: string;
  UomId: string;
}

export interface AllocationInventoryCandidate {
  Balance: InventoryBalanceEntity;
  Dimension: InventoryDimensionEntity;
  InventoryStatusCode: string;
}

export interface IAllocationInventoryRepository {
  ListCandidates(
    filter: AllocationInventoryCandidateFilter,
    manager?: EntityManager,
  ): Promise<AllocationInventoryCandidate[]>;
}
