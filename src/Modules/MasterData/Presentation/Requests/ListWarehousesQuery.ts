import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ListWarehousesQuery {
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
  public SiteId?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public WarehouseCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  public WarehouseName?: string;
}
