import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

export class ListWarehouseProfilesQuery {
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
  @IsEnum(WarehouseProfileStatus)
  public Status?: WarehouseProfileStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public WarehouseTypeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;
}
