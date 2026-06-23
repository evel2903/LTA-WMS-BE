import { EntityManager } from 'typeorm';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

export const INVENTORY_DIMENSION_REPOSITORY = Symbol('INVENTORY_DIMENSION_REPOSITORY');

export interface InventoryDimensionListFilter {
  OwnerId?: string;
  SkuId?: string;
  WarehouseId?: string;
  LocationId?: string;
  InventoryStatusId?: string;
  UomId?: string | null;
}

export interface IInventoryDimensionRepository {
  FindById(id: string): Promise<InventoryDimensionEntity | null>;
  FindByHash(dimensionKeyHash: string, manager?: EntityManager): Promise<InventoryDimensionEntity | null>;
  FindOrCreateByHashForUpdate(
    dimension: InventoryDimensionEntity,
    manager: EntityManager,
  ): Promise<InventoryDimensionEntity>;
  Create(dimension: InventoryDimensionEntity, manager?: EntityManager): Promise<InventoryDimensionEntity>;
  List(
    skip: number,
    take: number,
    filter?: InventoryDimensionListFilter,
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }>;
}
