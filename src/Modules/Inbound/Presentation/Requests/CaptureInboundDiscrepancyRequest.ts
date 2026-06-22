import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { InboundDiscrepancyType } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyType';

export class CaptureInboundDiscrepancyRequest {
  @IsString()
  @IsNotEmpty()
  public ReceiptLineId!: string;

  @IsEnum(InboundDiscrepancyType)
  public DiscrepancyType!: InboundDiscrepancyType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsString()
  @IsOptional()
  public ReasonNote?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public EvidenceRefs?: string[];

  @IsObject()
  @IsOptional()
  public EvidenceJson?: Record<string, unknown> | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
