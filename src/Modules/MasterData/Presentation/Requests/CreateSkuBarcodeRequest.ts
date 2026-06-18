import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateSkuBarcodeRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId!: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public OwnerId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public UomId!: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public PackCode?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BarcodeValue!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  public BarcodeType!: string;

  @IsOptional()
  @IsBoolean()
  public IsPrimary?: boolean;

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
