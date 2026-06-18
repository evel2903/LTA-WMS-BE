import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';

export const INVENTORY_BALANCE_REPOSITORY = Symbol('INVENTORY_BALANCE_REPOSITORY');

export interface InventoryBalanceListFilter {
  DimensionId?: string;
}

export interface IInventoryBalanceRepository {
  FindById(id: string): Promise<InventoryBalanceEntity | null>;
  FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null>;
  Create(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity>;
  List(
    skip: number,
    take: number,
    filter?: InventoryBalanceListFilter,
  ): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }>;
}
