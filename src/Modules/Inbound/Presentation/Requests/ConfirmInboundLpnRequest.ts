import { IsArray, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class ConfirmInboundLpnRequest {
  @IsString()
  @MaxLength(80)
  public LpnCode!: string;

  @IsString()
  @Matches(/^[0-9]{18}$/)
  @IsOptional()
  public SsccCode?: string | null;

  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  public Quantity?: number | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  public ReasonCode?: string | null;

  @IsString()
  @IsOptional()
  public ReasonNote?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
