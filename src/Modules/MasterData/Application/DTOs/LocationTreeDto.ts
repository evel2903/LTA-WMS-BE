import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export class LocationTreeDto {
  public Id!: string;
  public WarehouseId!: string;
  public ZoneId!: string;
  public ParentLocationId!: string | null;
  public LocationCode!: string;
  public LocationName!: string;
  public LocationType!: string;
  public LocationProfileId!: string;
  public LocationStatus!: LocationStatus;
  public AisleCode!: string | null;
  public RackCode!: string | null;
  public LevelCode!: string | null;
  public BinCode!: string | null;
  public Children!: LocationTreeDto[];
}
