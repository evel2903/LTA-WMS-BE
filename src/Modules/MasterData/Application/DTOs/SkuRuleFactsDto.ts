import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export interface SkuRuleFactsDto {
  SkuId: string;
  SkuCode: string;
  ItemClass: string;
  ItemStatus: SkuStatus;
  DefaultOwnerId: string | null;
  BaseUomId: string;
  InventoryUomId: string;
  LotControlled: boolean;
  ExpiryControlled: boolean;
  SerialControlled: boolean;
  OwnerControlled: boolean;
  LpnControlled: boolean;
  TemperatureControlled: boolean;
  DgControlled: boolean;
  CustomsControlled: boolean;
  QcRequired: boolean;
  TemperatureClass: string | null;
  DgClass: string | null;
  BondedFlag: boolean;
  ShelfLifeDays: number | null;
  MinRemainingShelfLifeDays: number | null;
}
