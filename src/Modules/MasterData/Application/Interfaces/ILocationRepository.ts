import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export const LOCATION_REPOSITORY = Symbol('ILocationRepository');

export type LocationListFilter = {
  WarehouseId?: string;
  ZoneId?: string;
  ParentLocationId?: string | null;
  LocationStatus?: LocationStatus;
  LocationType?: string;
  LocationProfileId?: string;
  LocationCode?: string;
};

export interface ILocationRepository {
  FindById(id: string): Promise<LocationEntity | null>;
  FindByWarehouseAndCode(warehouseId: string, locationCode: string): Promise<LocationEntity | null>;
  Create(location: LocationEntity): Promise<LocationEntity>;
  Update(location: LocationEntity): Promise<LocationEntity>;
  List(
    skip: number,
    take: number,
    filter?: LocationListFilter,
  ): Promise<{ Items: LocationEntity[]; TotalItems: number }>;
  ListForTree(warehouseId: string, zoneId?: string): Promise<LocationEntity[]>;
}
