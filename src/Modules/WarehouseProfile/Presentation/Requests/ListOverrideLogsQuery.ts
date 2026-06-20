import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

/** Query for GET /overrides — override-frequency filtering (FR-19). */
export class ListOverrideLogsQuery {
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
  public RuleId?: string;

  @IsOptional()
  @IsString()
  public ActorUserId?: string;

  @IsOptional()
  @IsEnum(ObjectType)
  public TargetObjectType?: ObjectType;

  @IsOptional()
  @IsString()
  public TargetObjectId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public From?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public To?: Date;
}
