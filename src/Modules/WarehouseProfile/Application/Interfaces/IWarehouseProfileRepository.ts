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
  /**
   * Returns every ACTIVE profile whose effective window contains `evaluatedAt`.
   * Scope-axis wildcard matching and most-specific selection happen in the resolver
   * (B3) so the port stays a thin boundary; B5 will enforce one active profile per scope.
   */
  ListActiveByScope(evaluatedAt: Date): Promise<WarehouseProfileEntity[]>;
}
