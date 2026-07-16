import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateInboundPlanLineRequest {
  @IsInt()
  @Min(1)
  public LineNumber!: number;

  @IsString()
  public SkuId!: string;

  @IsString()
  public UomId!: string;

  @IsNumber()
  @Min(0.0001)
  public ExpectedQuantity!: number;

  @IsOptional()
  @IsString()
  public ExternalLineReference?: string;
}

// IFB-24: full header + line replace while the plan is still Draft -- same
// field set as CreateInboundPlanRequest, on purpose (see UpdateInboundPlanUseCase).
export class UpdateInboundPlanRequest {
  @IsString()
  @IsNotEmpty()
  public SourceSystem!: string;

  @IsString()
  @IsNotEmpty()
  public SourceDocumentType!: string;

  @IsString()
  @IsNotEmpty()
  public SourceDocumentNumber!: string;

  @IsString()
  @IsNotEmpty()
  public SupplierId!: string;

  @IsString()
  @IsNotEmpty()
  public OwnerId!: string;

  @IsString()
  @IsNotEmpty()
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  public WarehouseProfileId?: string;

  @IsOptional()
  @IsDateString()
  public ExpectedArrivalAt?: string;

  // Re-review fix (P1 decision): optimistic concurrency for the full header+line
  // replace this use case does -- the client must echo back the UpdatedAt it last
  // saw; the use case 409s if the row has moved on since then. Reuses the existing
  // UpdatedAt audit column as the concurrency token (If-Unmodified-Since style)
  // instead of adding a dedicated version column -- see UpdateInboundPlanUseCase.
  @IsDateString()
  public ExpectedUpdatedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateInboundPlanLineRequest)
  public Lines!: UpdateInboundPlanLineRequest[];
}
