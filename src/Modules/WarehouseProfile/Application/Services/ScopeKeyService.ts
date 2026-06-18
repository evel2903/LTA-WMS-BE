import { createHash } from 'crypto';

export interface ScopeKeyInput {
  WarehouseTypeCode: string;
  WarehouseId?: string | null;
  ZoneId?: string | null;
  LocationType?: string | null;
  OwnerId?: string | null;
  SkuId?: string | null;
  ItemClass?: string | null;
  OrderType?: string | null;
  CustomerId?: string | null;
  SupplierId?: string | null;
}

/**
 * Builds a deterministic, order-independent scope key from the six V0 rule-engine axes.
 * Axis order is fixed (and prefixed) so the same value on a different axis cannot collide.
 * Null / undefined / absent all normalize to a single wildcard sentinel.
 * B5 relies on this format being stable to enforce one active profile per scope.
 */
export class ScopeKeyService {
  private static readonly Wildcard = '*';

  public Build(input: ScopeKeyInput): string {
    const axes: Array<[string, string | null | undefined]> = [
      ['warehouseType', input.WarehouseTypeCode],
      ['warehouse', input.WarehouseId],
      ['zone', input.ZoneId],
      ['locationType', input.LocationType],
      ['owner', input.OwnerId],
      ['sku', input.SkuId],
      ['itemClass', input.ItemClass],
      ['orderType', input.OrderType],
      ['customer', input.CustomerId],
      ['supplier', input.SupplierId],
    ];

    const canonical = axes.map(([axis, value]) => `${axis}=${this.Normalize(value)}`).join('|');

    return createHash('sha256').update(canonical).digest('hex');
  }

  private Normalize(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return ScopeKeyService.Wildcard;
    }
    const trimmed = value.trim().toUpperCase();
    return trimmed.length === 0 ? ScopeKeyService.Wildcard : trimmed;
  }
}
