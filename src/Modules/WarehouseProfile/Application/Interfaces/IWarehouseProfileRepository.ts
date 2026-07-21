import { EntityManager } from 'typeorm';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

export const WAREHOUSE_PROFILE_REPOSITORY = Symbol('IWarehouseProfileRepository');

export type WarehouseProfileListFilter = {
  Status?: WarehouseProfileStatus;
  WarehouseTypeCode?: string;
  WarehouseId?: string;
  Search?: string;
};

export interface IWarehouseProfileRepository {
  FindById(id: string): Promise<WarehouseProfileEntity | null>;
  FindByCode(profileCode: string): Promise<WarehouseProfileEntity | null>;
  Create(profile: WarehouseProfileEntity, manager?: EntityManager): Promise<WarehouseProfileEntity>;
  Update(profile: WarehouseProfileEntity, manager?: EntityManager): Promise<WarehouseProfileEntity>;
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
  /**
   * Returns the ACTIVE profiles that share `scopeKey` and whose effective window overlaps
   * [effectiveFrom, effectiveTo) (half-open; `effectiveTo = null` means +infinity), excluding
   * `excludeProfileId`. B5 uses this to enforce one active profile per scope at activation time
   * (architecture 5.2: application-level overlap check in the activation transaction).
   */
  FindActiveOverlapping(
    scopeKey: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeProfileId: string,
  ): Promise<WarehouseProfileEntity[]>;
  /**
   * Runs `work` inside a single database transaction, yielding a transaction-scoped repository so
   * reads and writes commit or roll back atomically. B5 uses this to perform the activation overlap
   * re-check and the ACTIVE status write in one transaction (architecture 5.2: "Application use case
   * phải check overlap TRONG transaction"), closing the read-then-write race between two concurrent
   * activations at the same ScopeKey. The non-transactional methods above remain available for
   * single reads/writes that do not need atomicity.
   */
  RunInTransaction<T>(
    work: (txRepository: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>,
  ): Promise<T>;
}
