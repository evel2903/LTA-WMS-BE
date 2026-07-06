import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

export const INVENTORY_SERIAL_LOOKUP_REPOSITORY = Symbol('INVENTORY_SERIAL_LOOKUP_REPOSITORY');

export interface InventorySerialLookupFilter {
  SkuId?: string;
  WarehouseId?: string;
  OwnerId?: string;
  SerialNumber?: string;
  LotNumber?: string;
}

export interface InventorySerialLookupRow {
  Balance: InventoryBalanceEntity;
  Dimension: InventoryDimensionEntity;
  SkuCode: string;
  WarehouseCode: string;
  LocationCode: string;
  InventoryStatusCode: string;
}

export interface IInventorySerialLookupRepository {
  List(
    skip: number,
    take: number,
    filter: InventorySerialLookupFilter,
  ): Promise<{ Items: InventorySerialLookupRow[]; TotalItems: number }>;
}
