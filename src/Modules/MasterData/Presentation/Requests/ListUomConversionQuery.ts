import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ListUomConversionQuery {
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
  public FromUomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ToUomId?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public EffectiveFrom?: Date;
}
