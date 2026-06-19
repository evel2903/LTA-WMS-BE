import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export class QueryAuditLogsQuery {
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
  public ActorUserId?: string;

  @IsOptional()
  @IsEnum(ActionCode)
  public Action?: ActionCode;

  @IsOptional()
  @IsEnum(ObjectType)
  public ObjectType?: ObjectType;

  @IsOptional()
  @IsString()
  public ObjectId?: string;

  @IsOptional()
  @IsString()
  public ReasonCodeId?: string;

  @IsOptional()
  @IsISO8601()
  public From?: string;

  @IsOptional()
  @IsISO8601()
  public To?: string;
}
