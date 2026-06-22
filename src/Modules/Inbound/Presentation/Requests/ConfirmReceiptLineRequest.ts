import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmReceiptLineRequest {
  @IsString()
  public InboundPlanLineId!: string;

  @IsNumber()
  @Min(0.0001)
  public ActualQuantity!: number;

  @IsOptional()
  @IsString()
  public SkuId?: string;

  @IsOptional()
  @IsString()
  public UomId?: string;

  @IsOptional()
  @IsBoolean()
  public ManualConfirm?: boolean;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsString()
  public IdempotencyKey!: string;

  @IsOptional()
  @IsObject()
  public ScanEvidence?: Record<string, unknown>;
}
