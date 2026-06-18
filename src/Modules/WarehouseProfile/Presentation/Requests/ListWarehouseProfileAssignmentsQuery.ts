import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class ListWarehouseProfileAssignmentsQuery {
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
  @IsEnum(AssignmentType)
  public AssignmentType?: AssignmentType;
}
