import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReplenishmentReasonedRequest {
  @IsString()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
