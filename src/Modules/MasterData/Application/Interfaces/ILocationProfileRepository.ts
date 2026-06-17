import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const LOCATION_PROFILE_REPOSITORY = Symbol('ILocationProfileRepository');

export type LocationProfileListFilter = {
  Status?: MasterDataStatus;
  LocationType?: string;
  ProfileCode?: string;
};

export interface ILocationProfileRepository {
  FindById(id: string): Promise<LocationProfileEntity | null>;
  FindByCode(profileCode: string): Promise<LocationProfileEntity | null>;
  Create(profile: LocationProfileEntity): Promise<LocationProfileEntity>;
  Update(profile: LocationProfileEntity): Promise<LocationProfileEntity>;
  List(
    skip: number,
    take: number,
    filter?: LocationProfileListFilter,
  ): Promise<{ Items: LocationProfileEntity[]; TotalItems: number }>;
}
