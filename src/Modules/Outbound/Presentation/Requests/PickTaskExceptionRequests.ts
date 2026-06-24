import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PickExceptionType } from '@modules/Outbound/Domain/Enums/PickExceptionType';
import type { PickSubstitutionPolicyDecision } from '@modules/Outbound/Application/DTOs/PickTaskExceptionDto';

export class ReportPickExceptionRequest {
  @IsOptional()
  @IsString()
  public MobileTaskId?: string | null;

  @IsEnum(PickExceptionType)
  public ExceptionType!: PickExceptionType;

  @IsOptional()
  @IsString()
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public ObservedQuantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public DamagedQuantity?: number | null;

  @IsOptional()
  @IsString()
  public ObservedSkuId?: string | null;

  @IsOptional()
  @IsString()
  public ObservedSkuCode?: string | null;

  @IsOptional()
  @IsString()
  public ReplenishmentTargetLocationId?: string | null;

  @IsString()
  @IsNotEmpty()
  public IdempotencyKey!: string;
}

export class RequestPickSubstitutionRequest {
  @IsOptional()
  @IsString()
  public MobileTaskId?: string | null;

  @IsString()
  @IsNotEmpty()
  public SubstituteSkuId!: string;

  @IsOptional()
  @IsString()
  public SubstituteSkuCode?: string | null;

  @IsOptional()
  @IsString()
  public SubstituteUomId?: string | null;

  @IsOptional()
  @IsString()
  public SubstituteUomCode?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  public Quantity!: number;

  @IsIn(['Allow', 'RequireApproval', 'Disallow'])
  public PolicyDecision!: PickSubstitutionPolicyDecision;

  @IsOptional()
  @IsString()
  public PolicyReason?: string | null;

  @IsOptional()
  @IsString()
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @IsNotEmpty()
  public IdempotencyKey!: string;
}
