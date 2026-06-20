import { EntityManager } from 'typeorm';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const WAREHOUSE_REPOSITORY = Symbol('IWarehouseRepository');

export type WarehouseListFilter = {
  SiteId?: string;
  Status?: MasterDataStatus;
  WarehouseCode?: string;
};

export interface IWarehouseRepository {
  FindById(id: string): Promise<WarehouseEntity | null>;
  FindByCode(warehouseCode: string): Promise<WarehouseEntity | null>;
  Create(warehouse: WarehouseEntity, manager?: EntityManager): Promise<WarehouseEntity>;
  Update(warehouse: WarehouseEntity, manager?: EntityManager): Promise<WarehouseEntity>;
  List(
    skip: number,
    take: number,
    filter?: WarehouseListFilter,
  ): Promise<{ Items: WarehouseEntity[]; TotalItems: number }>;
}
