import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';

export class ListPickReleasesQuery {
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
  @IsEnum(PickReleaseStatus)
  public Status?: PickReleaseStatus;
}
