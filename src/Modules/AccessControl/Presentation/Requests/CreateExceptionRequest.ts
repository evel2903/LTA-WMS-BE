import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';

export class CreateExceptionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  public ExceptionType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  public ReferenceType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  public ReferenceId!: string;

  @IsOptional()
  @IsEnum(ControlExceptionSeverity)
  public Severity?: ControlExceptionSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public DetectedRuleId?: string;

  @IsOptional()
  @IsArray()
  public EvidenceRefs?: unknown[];
}
