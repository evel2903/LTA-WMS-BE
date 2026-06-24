import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';

export class AllocateOutboundOrderRequest {
  @IsOptional()
  @IsIn([
    AllocationPolicy.FullOnly,
    AllocationPolicy.PartialBackorder,
    'full-only',
    'partial-backorder',
    'FULL_ONLY',
    'PARTIAL_BACKORDER',
  ])
  public Policy?: AllocationPolicy | string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  public IdempotencyKey!: string;
}
