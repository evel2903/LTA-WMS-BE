import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class EvaluateQcTaskRequest {
  @IsString()
  @IsNotEmpty()
  public ReceiptLineId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  public IdempotencyKey!: string;

  @IsBoolean()
  @IsOptional()
  public ForceRequired?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  public ReasonCode?: string | null;

  @IsString()
  @IsOptional()
  public ReasonNote?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public EvidenceRefs?: string[];
}
