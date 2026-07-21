import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export class ListSkusQuery {
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
  @IsEnum(SkuStatus)
  public ItemStatus?: SkuStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public SkuCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public SkuName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public DefaultOwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public ItemClass?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public Search?: string;
}
