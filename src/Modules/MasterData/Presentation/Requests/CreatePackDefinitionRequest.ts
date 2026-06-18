import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreatePackDefinitionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public PackCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public PackName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public UomId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  public QuantityPerPack!: number;

  @IsOptional()
  @IsBoolean()
  public IsDefault?: boolean;

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
