import { EntityManager } from 'typeorm';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';

export const INVENTORY_BALANCE_REPOSITORY = Symbol('INVENTORY_BALANCE_REPOSITORY');

export interface InventoryBalanceListFilter {
  DimensionId?: string;
}

export interface IInventoryBalanceRepository {
  FindById(id: string): Promise<InventoryBalanceEntity | null>;
  FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null>;
  FindByDimensionIdForUpdate(dimensionId: string, manager: EntityManager): Promise<InventoryBalanceEntity | null>;
  FindOrCreateByDimensionIdForUpdate(
    balance: InventoryBalanceEntity,
    manager: EntityManager,
  ): Promise<InventoryBalanceEntity>;
  Create(balance: InventoryBalanceEntity, manager?: EntityManager): Promise<InventoryBalanceEntity>;
  Update(balance: InventoryBalanceEntity, manager?: EntityManager): Promise<InventoryBalanceEntity>;
  List(
    skip: number,
    take: number,
    filter?: InventoryBalanceListFilter,
  ): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }>;
}
