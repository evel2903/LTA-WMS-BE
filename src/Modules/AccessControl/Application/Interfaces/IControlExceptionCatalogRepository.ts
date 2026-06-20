import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';

export const CONTROL_EXCEPTION_CATALOG_REPOSITORY = Symbol('IControlExceptionCatalogRepository');

export interface IControlExceptionCatalogRepository {
  FindByCode(code: string): Promise<ControlExceptionCatalogEntity | null>;
  List(): Promise<ControlExceptionCatalogEntity[]>;
  /** Idempotent upsert keyed by Code — re-runs update in place, never duplicate. */
  Upsert(entity: ControlExceptionCatalogEntity): Promise<ControlExceptionCatalogEntity>;
}
