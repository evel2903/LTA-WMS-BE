import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const ZONE_REPOSITORY = Symbol('IZoneRepository');

export type ZoneListFilter = {
  WarehouseId?: string;
  Status?: MasterDataStatus;
  ZoneCode?: string;
};

export interface IZoneRepository {
  FindById(id: string): Promise<ZoneEntity | null>;
  FindByWarehouseAndCode(warehouseId: string, zoneCode: string): Promise<ZoneEntity | null>;
  Create(zone: ZoneEntity): Promise<ZoneEntity>;
  Update(zone: ZoneEntity): Promise<ZoneEntity>;
  List(skip: number, take: number, filter?: ZoneListFilter): Promise<{ Items: ZoneEntity[]; TotalItems: number }>;
}
