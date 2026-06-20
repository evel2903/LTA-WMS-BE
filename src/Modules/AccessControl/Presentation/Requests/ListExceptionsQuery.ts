import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';

export class ListExceptionsQuery {
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
  @IsEnum(ExceptionState)
  public State?: ExceptionState;

  @IsOptional()
  @IsString()
  public ExceptionType?: string;

  @IsOptional()
  @IsString()
  public ReferenceType?: string;

  @IsOptional()
  @IsString()
  public ReferenceId?: string;

  @IsOptional()
  @IsString()
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  public AssignedToUserId?: string;

  @IsOptional()
  @IsEnum(ControlExceptionSeverity)
  public Severity?: ControlExceptionSeverity;
}
