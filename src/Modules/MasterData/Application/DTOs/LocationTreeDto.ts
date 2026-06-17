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
  public Children!: LocationTreeDto[];
}
