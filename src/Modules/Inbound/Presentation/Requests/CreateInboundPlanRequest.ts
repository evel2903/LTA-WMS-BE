import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInboundPlanLineRequest {
  @IsNumber()
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

export class CreateInboundPlanRequest {
  @IsString()
  public SourceSystem!: string;

  @IsString()
  public SourceDocumentType!: string;

  @IsString()
  public SourceDocumentNumber!: string;

  @IsString()
  public SupplierId!: string;

  @IsString()
  public OwnerId!: string;

  @IsString()
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  public WarehouseProfileId?: string;

  @IsOptional()
  @IsDateString()
  public ExpectedArrivalAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInboundPlanLineRequest)
  public Lines!: CreateInboundPlanLineRequest[];
}
