import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const ITEM_COVERAGE_REPOSITORY = Symbol('ITEM_COVERAGE_REPOSITORY');

export interface ItemCoverageListFilter {
  SkuId?: string;
  WarehouseId?: string;
  OwnerId?: string | null;
  Status?: MasterDataStatus;
}

export interface IItemCoverageRepository {
  FindById(id: string): Promise<ItemCoverageEntity | null>;
  FindBySkuWarehouseOwner(
    skuId: string,
    warehouseId: string,
    ownerId: string | null,
  ): Promise<ItemCoverageEntity | null>;
  Create(itemCoverage: ItemCoverageEntity): Promise<ItemCoverageEntity>;
  Update(itemCoverage: ItemCoverageEntity): Promise<ItemCoverageEntity>;
  List(
    skip: number,
    take: number,
    filter?: ItemCoverageListFilter,
  ): Promise<{ Items: ItemCoverageEntity[]; TotalItems: number }>;
}
