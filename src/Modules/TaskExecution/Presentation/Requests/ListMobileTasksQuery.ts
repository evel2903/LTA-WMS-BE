import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

export class ListMobileTasksQuery {
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
  @MaxLength(100)
  public WarehouseId?: string;

  @IsOptional()
  @IsEnum(MobileTaskType)
  public TaskType?: MobileTaskType;

  @IsOptional()
  @IsEnum(MobileTaskStatus)
  public TaskStatus?: MobileTaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public Search?: string;
}
