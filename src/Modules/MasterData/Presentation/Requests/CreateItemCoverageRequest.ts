import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateItemCoverageRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public WarehouseId!: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public OwnerId?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public MinQty?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public MaxQty?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public StandardQty?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  public MultipleQty?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public LeadTimeDays?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public DefaultReceiveWarehouseId?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public DefaultShipWarehouseId?: string | null;

  @IsOptional()
  @IsObject()
  public ReorderPolicy?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  public StopReceiving?: boolean;

  @IsOptional()
  @IsBoolean()
  public StopShipping?: boolean;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;
}
