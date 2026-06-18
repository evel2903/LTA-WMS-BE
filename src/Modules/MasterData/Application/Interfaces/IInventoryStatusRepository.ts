import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const INVENTORY_STATUS_REPOSITORY = Symbol('INVENTORY_STATUS_REPOSITORY');

export interface InventoryStatusListFilter {
  StatusCode?: string;
  StageGroup?: string;
  Status?: MasterDataStatus;
}

export interface IInventoryStatusRepository {
  FindById(id: string): Promise<InventoryStatusEntity | null>;
  FindByCode(statusCode: string): Promise<InventoryStatusEntity | null>;
  List(
    skip: number,
    take: number,
    filter?: InventoryStatusListFilter,
  ): Promise<{ Items: InventoryStatusEntity[]; TotalItems: number }>;
}
