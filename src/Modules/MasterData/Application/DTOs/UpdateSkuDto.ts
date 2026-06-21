import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export interface UpdateSkuDto {
  Id: string;
  SkuCode?: string;
  SkuName?: string;
  DefaultOwnerId?: string | null;
  ItemClass?: string;
  ItemStatus?: SkuStatus;
  BaseUomId?: string;
  InventoryUomId?: string;
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
  SourceSystem?: string | null;
  ReferenceId?: string | null;
  ActorUserId?: string;
  ReasonCode?: string | null;
}
