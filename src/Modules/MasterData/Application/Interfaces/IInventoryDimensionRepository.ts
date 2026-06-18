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
  FindByHash(dimensionKeyHash: string): Promise<InventoryDimensionEntity | null>;
  Create(dimension: InventoryDimensionEntity): Promise<InventoryDimensionEntity>;
  List(
    skip: number,
    take: number,
    filter?: InventoryDimensionListFilter,
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }>;
}
