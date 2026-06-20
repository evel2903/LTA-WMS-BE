import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsEnum } from 'class-validator';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

/** Body for POST /overrides. The override-readiness flags come from the rule, never the client. */
export class RequestOverrideRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public RuleId!: string;

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
  @MaxLength(36)
  public ApprovalRequestId?: string;

  @IsOptional()
  @IsObject()
  public BeforeJson?: Record<string, unknown>;
}
