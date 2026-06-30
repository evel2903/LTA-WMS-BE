import { EntityManager } from 'typeorm';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const WAREHOUSE_TYPE_REPOSITORY = Symbol('IWarehouseTypeRepository');

export type WarehouseTypeListFilter = {
  WarehouseTypeCode?: string;
  Status?: MasterDataStatus;
};

export interface IWarehouseTypeRepository {
  FindById(id: string): Promise<WarehouseTypeEntity | null>;
  FindByCode(warehouseTypeCode: string): Promise<WarehouseTypeEntity | null>;
  Create(warehouseType: WarehouseTypeEntity, manager?: EntityManager): Promise<WarehouseTypeEntity>;
  Update(warehouseType: WarehouseTypeEntity, manager?: EntityManager): Promise<WarehouseTypeEntity>;
  List(
    skip: number,
    take: number,
    filter?: WarehouseTypeListFilter,
  ): Promise<{ Items: WarehouseTypeEntity[]; TotalItems: number }>;
}
