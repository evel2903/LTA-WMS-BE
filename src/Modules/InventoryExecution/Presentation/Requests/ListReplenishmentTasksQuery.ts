import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';

export class ListReplenishmentTasksQuery {
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
  @IsEnum(ReplenishmentTaskStatus)
  public TaskStatus?: ReplenishmentTaskStatus;

  @IsOptional()
  @IsEnum(ReplenishmentTriggerType)
  public TriggerType?: ReplenishmentTriggerType;
}
