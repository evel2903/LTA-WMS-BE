import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * HTTP request shape for the read-only rule preview endpoint (B4 AC1). class-validator only;
 * runs under the global ValidationPipe (whitelist / forbidNonWhitelisted / transform).
 *
 * WarehouseTypeCode is the only required axis; the other five axes are optional (null = wildcard,
 * resolved by B3). EvaluatedAt is validated as an ISO date string and converted to a Date in the
 * controller. Attributes carries business data read by condition predicates (B3 contract). Actor
 * metadata is optional and echoed back for B5/Epic C.
 */
export class PreviewRuleResolutionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public WarehouseTypeCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ZoneId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SkuId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public ItemClass?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public OrderType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public CustomerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SupplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ActorUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public Action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public ObjectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ObjectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReasonCode?: string;

  @IsOptional()
  @IsDateString()
  public EvaluatedAt?: string;

  @IsOptional()
  @IsObject()
  public Attributes?: Record<string, unknown>;
}
