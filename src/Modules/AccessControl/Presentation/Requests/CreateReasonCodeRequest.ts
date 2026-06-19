import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';

export class CreateReasonCodeRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  public ReasonCode!: string;

  @IsEnum(ReasonGroup)
  public ReasonGroup!: ReasonGroup;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ActionCode, { each: true })
  public AppliesToActions!: ActionCode[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ObjectType, { each: true })
  public AppliesToObjects!: ObjectType[];

  @IsOptional()
  @IsBoolean()
  public EvidenceRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  public ApprovalRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  public AllowedRoleCodes?: RoleCode[];

  @IsOptional()
  @IsISO8601()
  public EffectiveFrom?: string;

  @IsOptional()
  @IsISO8601()
  public EffectiveTo?: string;
}
