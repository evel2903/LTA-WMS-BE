import { IsArray, IsObject, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class DeadLetterActionRequest {
  @IsString()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string | null;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  public EvidenceRefs!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public IdempotencyKey?: string | null;

  @IsOptional()
  @IsObject()
  public ManualFixPayload?: Record<string, unknown> | null;
}
