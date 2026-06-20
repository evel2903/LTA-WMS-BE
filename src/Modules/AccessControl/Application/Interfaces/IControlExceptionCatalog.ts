import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';

export const CONTROL_EXCEPTION_CATALOG = Symbol('IControlExceptionCatalog');

/**
 * Catalog port consumed by C9 (exception lifecycle) — same in-module wiring as the
 * reason-code catalog. C9 validates an exception type/reason/evidence against the seeded
 * control-exception catalog before raising/resolving an exception.
 */
export interface IControlExceptionCatalog {
  FindByCode(code: string): Promise<ControlExceptionCatalogEntity | null>;
  List(): Promise<ControlExceptionCatalogEntity[]>;
  /**
   * Resolve an exception type for C9. Throws BusinessRuleException when the code is unknown
   * or is a DeferredV1Plus item (not raisable in V0). Returns the catalog entry otherwise,
   * so C9 can read reason/evidence/approval requirements and category.
   */
  ValidateExceptionType(code: string): Promise<ControlExceptionCatalogEntity>;
}
