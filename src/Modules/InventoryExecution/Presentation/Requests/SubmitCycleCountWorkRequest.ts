import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SubmitCycleCountWorkRequest {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public CountedQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ApprovalRequestId?: string | null;

  @IsString()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
