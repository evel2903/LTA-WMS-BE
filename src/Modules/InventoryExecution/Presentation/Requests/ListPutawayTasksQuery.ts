import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';

export class ListPutawayTasksQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public PageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsEnum(PutawayTaskStatus)
  public TaskStatus?: PutawayTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public InboundPutawayReleaseId?: string;
}
