import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateUomConversionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SkuId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public FromUomId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public ToUomId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  public Factor!: number;

  @Type(() => Date)
  @IsDate()
  public EffectiveFrom!: Date;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Date)
  @IsDate()
  public EffectiveTo?: Date | null;

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
