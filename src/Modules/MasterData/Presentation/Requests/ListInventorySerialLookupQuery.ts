import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListInventorySerialLookupQuery {
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
  public SkuId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SerialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public LotNumber?: string;
}
