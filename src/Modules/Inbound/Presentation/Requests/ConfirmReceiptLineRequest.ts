import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class ConfirmReceiptLineRequest {
  @IsOptional()
  @IsString()
  public InboundPlanLineId?: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  @Max(99_999_999_999_999)
  @Min(0.0001)
  public ActualQuantity!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 })
  @Max(99_999_999_999_999)
  @Min(0.0001)
  public ExpectedQuantity?: number;

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

  @IsOptional()
  @IsString()
  public LotNumber?: string;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  public ExpiryDate?: string;

  @IsOptional()
  @IsString()
  public SerialNumber?: string;

  @IsString()
  public IdempotencyKey!: string;

  @IsOptional()
  @IsObject()
  public ScanEvidence?: Record<string, unknown>;
}
