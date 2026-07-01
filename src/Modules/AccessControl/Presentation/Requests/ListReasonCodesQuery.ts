import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';

export class ListReasonCodesQuery {
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
  @IsEnum(ReasonGroup)
  public ReasonGroup?: ReasonGroup;

  @IsOptional()
  @IsEnum(ReasonCodeStatus)
  public Status?: ReasonCodeStatus;

  @IsOptional()
  @IsEnum(ActionCode)
  public Action?: ActionCode;

  @IsOptional()
  @IsEnum(ObjectType)
  public ObjectType?: ObjectType;
}
