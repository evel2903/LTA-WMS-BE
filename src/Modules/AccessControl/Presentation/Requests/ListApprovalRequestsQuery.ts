import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';

export class ListApprovalRequestsQuery {
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
  @IsEnum(ApprovalDecision)
  public Decision?: ApprovalDecision;

  @IsOptional()
  @IsString()
  public RequesterUserId?: string;

  @IsOptional()
  @IsEnum(ObjectType)
  public TargetObjectType?: ObjectType;

  @IsOptional()
  @IsString()
  public TargetObjectId?: string;

  @IsOptional()
  @IsEnum(ActionCode)
  public Action?: ActionCode;
}
