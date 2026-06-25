import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReconciliationRunRequest {
  @IsString()
  @MaxLength(120)
  public BusinessReference!: string;

  @IsString()
  @MaxLength(100)
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerId?: string | null;

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

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
