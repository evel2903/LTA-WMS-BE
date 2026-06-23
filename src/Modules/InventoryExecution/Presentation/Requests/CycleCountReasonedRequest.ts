import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CycleCountReasonedRequest {
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
