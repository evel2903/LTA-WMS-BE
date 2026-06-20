import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export class CreateApprovalRequestRequest {
  @IsEnum(ActionCode)
  public Action!: ActionCode;

  @IsEnum(ObjectType)
  public TargetObjectType!: ObjectType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  public TargetObjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public TargetObjectCode?: string;

  @IsOptional()
  @IsObject()
  public Scope?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  public EvidenceRefs?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  public ReferenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReferenceId?: string;
}
