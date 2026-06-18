import { createHash } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';

export interface InventoryDimensionKeyInput {
  OwnerId: string;
  SkuId: string;
  WarehouseId: string;
  LocationId: string;
  InventoryStatusId: string;
  UomId?: string | null;
  LpnCode?: string | null;
  LotNumber?: string | null;
  ExpiryDate?: Date | null;
  SerialNumber?: string | null;
  ProductionDate?: Date | null;
  CountryOfOrigin?: string | null;
  CustomsStatus?: string | null;
}

export class InventoryDimensionKeyService {
  public BuildHash(input: InventoryDimensionKeyInput): string {
    const payload = {
      OwnerId: this.RequireNonEmptyString(input.OwnerId, 'OwnerId'),
      SkuId: this.RequireNonEmptyString(input.SkuId, 'SkuId'),
      WarehouseId: this.RequireNonEmptyString(input.WarehouseId, 'WarehouseId'),
      LocationId: this.RequireNonEmptyString(input.LocationId, 'LocationId'),
      InventoryStatusId: this.RequireNonEmptyString(input.InventoryStatusId, 'InventoryStatusId'),
      UomId: this.NormalizeOptionalString(input.UomId, 'UomId'),
      LpnCode: this.NormalizeOptionalString(input.LpnCode, 'LpnCode'),
      LotNumber: this.NormalizeOptionalString(input.LotNumber, 'LotNumber'),
      ExpiryDate: this.NormalizeOptionalDate(input.ExpiryDate, 'ExpiryDate'),
      SerialNumber: this.NormalizeOptionalString(input.SerialNumber, 'SerialNumber'),
      ProductionDate: this.NormalizeOptionalDate(input.ProductionDate, 'ProductionDate'),
      CountryOfOrigin: this.NormalizeOptionalString(input.CountryOfOrigin, 'CountryOfOrigin'),
      CustomsStatus: this.NormalizeOptionalString(input.CustomsStatus, 'CustomsStatus'),
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  public NormalizeOptionalString(value: string | null | undefined, label: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BusinessRuleException(`${label} must be a string`);
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BusinessRuleException(`${label} cannot be empty`);
    }
    return trimmed;
  }

  public NormalizeOptionalDate(value: Date | null | undefined, label: string): Date | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BusinessRuleException(`${label} must be a valid date`);
    }
    return new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
  }

  private RequireNonEmptyString(value: string, label: string): string {
    const normalized = this.NormalizeOptionalString(value, label);
    if (!normalized) {
      throw new BusinessRuleException(`${label} is required`);
    }
    return normalized;
  }
}
