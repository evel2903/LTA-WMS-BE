import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReconciliationItemRequest {
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

  @IsString()
  @MaxLength(500)
  public ResolutionNote!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ApprovalRequestId?: string | null;

  @IsOptional()
  @IsBoolean()
  public ImpactsInventory?: boolean;

  @IsOptional()
  @IsBoolean()
  public ImpactsFinance?: boolean;
}
