import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  // Required (not optional) — a SKU-less call would join+scan every balance
  // in the warehouse; this endpoint is a SKU-scoped lookup, not a browser.
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId!: string;

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
