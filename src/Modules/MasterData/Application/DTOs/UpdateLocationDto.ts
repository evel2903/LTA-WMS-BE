import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export class UpdateLocationDto {
  public Id!: string;
  public WarehouseId?: string;
  public ZoneId?: string;
  public ParentLocationId?: string | null;
  public LocationCode?: string;
  public LocationName?: string;
  public LocationType?: string;
  public LocationProfileId?: string;
  public LocationStatus?: LocationStatus;
  public CapacityQty?: number | null;
  public CapacityVolume?: number | null;
  public CapacityWeight?: number | null;
  public PalletSlot?: number | null;
  public TemperatureClass?: string | null;
  public DgCompatibilityGroup?: string | null;
  public BondedFlag?: boolean | null;
  public OwnerRestriction?: string | null;
  public MixSkuPolicy?: string | null;
  public MixLotPolicy?: string | null;
  public MixOwnerPolicy?: string | null;
  public PickSequence?: number | null;
  public PutawaySequence?: number | null;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ReasonCode?: string | null;
}
