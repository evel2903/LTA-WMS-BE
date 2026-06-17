import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

export class ListLocationsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public PageSize?: number;

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
  @MaxLength(36)
  public ParentLocationId?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  public LocationStatus?: LocationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public LocationProfileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public LocationCode?: string;
}
