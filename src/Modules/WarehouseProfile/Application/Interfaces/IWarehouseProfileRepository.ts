import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

export const WAREHOUSE_PROFILE_REPOSITORY = Symbol('IWarehouseProfileRepository');

export type WarehouseProfileListFilter = {
  Status?: WarehouseProfileStatus;
  WarehouseTypeCode?: string;
  WarehouseId?: string;
};

export interface IWarehouseProfileRepository {
  FindById(id: string): Promise<WarehouseProfileEntity | null>;
  FindByCode(profileCode: string): Promise<WarehouseProfileEntity | null>;
  Create(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity>;
  Update(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity>;
  List(
    skip: number,
    take: number,
    filter?: WarehouseProfileListFilter,
  ): Promise<{ Items: WarehouseProfileEntity[]; TotalItems: number }>;
}
