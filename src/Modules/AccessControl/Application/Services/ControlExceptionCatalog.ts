import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { IControlExceptionCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalogRepository';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';

/**
 * Catalog-backed control-exception lookup (C8). C9 validates an exception type before
 * raising/resolving: deny (BusinessRuleException) when the code is unknown or is a
 * DeferredV1Plus item (advanced escalation/analytics/manual-fix not raisable in V0) —
 * the same "reject the unsatisfiable" discipline as the reason-code catalog.
 */
export class ControlExceptionCatalog implements IControlExceptionCatalog {
  constructor(private readonly repository: IControlExceptionCatalogRepository) {}

  public async FindByCode(code: string): Promise<ControlExceptionCatalogEntity | null> {
    return this.repository.FindByCode(code);
  }

  public async List(): Promise<ControlExceptionCatalogEntity[]> {
    return this.repository.List();
  }

  public async ValidateExceptionType(code: string): Promise<ControlExceptionCatalogEntity> {
    const normalized = (code ?? '').trim();
    if (normalized.length === 0) {
      throw new BusinessRuleException('Control exception code is required');
    }
    const entry = await this.repository.FindByCode(normalized);
    if (!entry) {
      throw new BusinessRuleException(`Unknown control exception code: ${normalized}`);
    }
    // Allowlist: only V0-raisable items (Implemented or DeferredToC9). Deny DeferredV1Plus and any
    // future/unrecognized status by default rather than admitting it.
    if (!entry.IsRequiredForV0()) {
      throw new BusinessRuleException(`Control exception code is not raisable in V0 (deferred): ${normalized}`);
    }
    return entry;
  }
}
