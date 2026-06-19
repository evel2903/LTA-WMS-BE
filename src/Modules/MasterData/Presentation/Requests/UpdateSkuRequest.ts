import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export class UpdateSkuRequest {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public SkuCode?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public SkuName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public DefaultOwnerId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ItemClass?: string;

  @IsOptional()
  @IsEnum(SkuStatus)
  public ItemStatus?: SkuStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public BaseUomId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public InventoryUomId?: string;

  @IsOptional()
  @IsBoolean()
  public LotControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public ExpiryControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public SerialControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public OwnerControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public LpnControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public TemperatureControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public DgControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public CustomsControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  public QcRequired?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public TemperatureClass?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public DgClass?: string | null;

  @IsOptional()
  @IsBoolean()
  public BondedFlag?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public ShelfLifeDays?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public MinRemainingShelfLifeDays?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReasonCode?: string;
}
