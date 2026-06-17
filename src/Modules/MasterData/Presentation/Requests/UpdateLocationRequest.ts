import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export class UpdateLocationRequest {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ZoneId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public ParentLocationId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public LocationCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public LocationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public LocationProfileId?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  public LocationStatus?: LocationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityQty?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityVolume?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityWeight?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PalletSlot?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public TemperatureClass?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public DgCompatibilityGroup?: string | null;

  @IsOptional()
  @IsBoolean()
  public BondedFlag?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerRestriction?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixSkuPolicy?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixLotPolicy?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixOwnerPolicy?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PickSequence?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PutawaySequence?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;
}
