import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ScopeTarget } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { ScopeConfig, ScopeSource } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';

/**
 * Resolves request-resident scope ids from a route's ScopeConfig. Runs inside the
 * guard, BEFORE ValidationPipe, so it reads the RAW request (PascalCase body keys,
 * un-coerced). Entity-resident scope (PATCH/:id) is NOT handled here — that is a
 * use-case re-check concern.
 */
@Injectable()
export class ScopeExtractor {
  public Extract(request: Request, config: ScopeConfig): ScopeTarget {
    return {
      WarehouseId: this.Read(request, config.WarehouseId),
      ZoneId: this.Read(request, config.ZoneId),
      OwnerId: this.Read(request, config.OwnerId),
    };
  }

  private Read(request: Request, source?: ScopeSource): string | null {
    if (!source) return null;
    const bag = this.Bag(request, source.In);
    const value = bag?.[source.Key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private Bag(request: Request, where: ScopeSource['In']): Record<string, unknown> | undefined {
    if (where === 'param') return request.params as Record<string, unknown> | undefined;
    if (where === 'query') return request.query as Record<string, unknown> | undefined;
    return request.body as Record<string, unknown> | undefined;
  }
}
