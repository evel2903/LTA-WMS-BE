import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportOutboundOrderLineRequest {
  @IsInt()
  @Min(1)
  public LineNumber!: number;

  @IsString()
  public SkuId!: string;

  @IsString()
  public UomId!: string;

  @IsNumber()
  @Min(0.0001)
  public OrderedQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public ExternalLineReference?: string;
}

export class ImportOutboundOrderRequest {
  @IsString()
  @MaxLength(100)
  public SourceSystem!: string;

  @IsString()
  @MaxLength(120)
  public SourceReference!: string;

  @IsOptional()
  @IsString()
  public CustomerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public CustomerSourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public CustomerExternalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  public ShipToReference?: string;

  @IsString()
  public OwnerId!: string;

  @IsString()
  public WarehouseId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public Priority?: number;

  @IsOptional()
  @IsDateString()
  public CutoffAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(180)
  public IdempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportOutboundOrderLineRequest)
  public Lines!: ImportOutboundOrderLineRequest[];
}
