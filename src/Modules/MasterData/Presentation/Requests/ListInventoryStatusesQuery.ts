import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ListInventoryStatusesQuery {
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
  @MaxLength(50)
  public StatusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public StageGroup?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;
}
