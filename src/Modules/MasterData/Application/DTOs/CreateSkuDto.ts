import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export interface CreateSkuDto {
  SkuCode: string;
  SkuName: string;
  DefaultOwnerId?: string | null;
  ItemClass: string;
  ItemStatus: SkuStatus;
  BaseUomId: string;
  InventoryUomId: string;
  LotControlled?: boolean;
  ExpiryControlled?: boolean;
  SerialControlled?: boolean;
  OwnerControlled?: boolean;
  LpnControlled?: boolean;
  TemperatureControlled?: boolean;
  DgControlled?: boolean;
  CustomsControlled?: boolean;
  QcRequired?: boolean;
  TemperatureClass?: string | null;
  DgClass?: string | null;
  BondedFlag?: boolean;
  ShelfLifeDays?: number | null;
  MinRemainingShelfLifeDays?: number | null;
  SourceSystem?: string;
  ReferenceId?: string;
  ReasonCode?: string | null;
}
