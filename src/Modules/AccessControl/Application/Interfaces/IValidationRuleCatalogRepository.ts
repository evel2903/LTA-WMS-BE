import { ValidationRuleCatalogEntity } from '@modules/AccessControl/Domain/Entities/ValidationRuleCatalogEntity';

export const VALIDATION_RULE_CATALOG_REPOSITORY = Symbol('IValidationRuleCatalogRepository');

export interface IValidationRuleCatalogRepository {
  FindByCode(code: string): Promise<ValidationRuleCatalogEntity | null>;
  List(): Promise<ValidationRuleCatalogEntity[]>;
  /** Idempotent upsert keyed by Code — re-runs update in place, never duplicate. */
  Upsert(entity: ValidationRuleCatalogEntity): Promise<ValidationRuleCatalogEntity>;
}
