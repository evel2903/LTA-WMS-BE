import { IsArray, IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';

export class UpdateReasonCodeRequest {
  @IsOptional()
  @IsEnum(ReasonGroup)
  public ReasonGroup?: ReasonGroup;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(ActionCode, { each: true })
  public AppliesToActions?: ActionCode[];

  @IsOptional()
  @IsArray()
  @IsEnum(ObjectType, { each: true })
  public AppliesToObjects?: ObjectType[];

  @IsOptional()
  @IsBoolean()
  public EvidenceRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  public ApprovalRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  public AllowedRoleCodes?: RoleCode[] | null;

  @IsOptional()
  @IsEnum(ReasonCodeStatus)
  public Status?: ReasonCodeStatus;

  @IsOptional()
  @IsISO8601()
  public EffectiveFrom?: string | null;

  @IsOptional()
  @IsISO8601()
  public EffectiveTo?: string | null;
}
