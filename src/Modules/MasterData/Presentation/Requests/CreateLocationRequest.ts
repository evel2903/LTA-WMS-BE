import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export class CreateLocationRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public WarehouseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public ZoneId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public ParentLocationId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public LocationCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public LocationName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public LocationType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public LocationProfileId!: string;

  @IsEnum(LocationStatus)
  public LocationStatus!: LocationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityVolume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CapacityWeight?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  public AisleCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  public RackCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  public LevelCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  public BinCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PalletSlot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public TemperatureClass?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public DgCompatibilityGroup?: string;

  @IsOptional()
  @IsBoolean()
  public BondedFlag?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerRestriction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixSkuPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixLotPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public MixOwnerPolicy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PickSequence?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public PutawaySequence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReasonCode?: string;
}
