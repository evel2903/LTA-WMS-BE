import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSkuBarcodeRequest {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public OwnerId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public UomId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public PackCode?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BarcodeValue?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  public BarcodeType?: string;

  @IsOptional()
  @IsBoolean()
  public IsPrimary?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Date)
  @IsDate()
  public EffectiveFrom?: Date | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Date)
  @IsDate()
  public EffectiveTo?: Date | null;

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
