import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';

export class ValidateLabelBlockingRequest {
  @IsEnum(LabelBlockingDownstreamAction)
  public DownstreamAction!: LabelBlockingDownstreamAction;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public BusinessObjectType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BusinessObjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public BusinessObjectCode?: string | null;

  @IsString()
  @IsNotEmpty()
  public WarehouseProfileId!: string;

  @IsOptional()
  @IsString()
  public WarehouseId?: string | null;

  @IsOptional()
  @IsString()
  public OwnerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public LabelType?: string | null;

  @IsOptional()
  @IsBoolean()
  public AttemptOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  public EvidenceRefs?: unknown[] | null;
}
