import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateManualReceiptRequest {
  @IsString()
  @IsNotEmpty()
  public OwnerId!: string;

  @IsString()
  @IsNotEmpty()
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  public WarehouseProfileId?: string;

  @IsString()
  @IsNotEmpty()
  public SupplierId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public ReceiptNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  public BusinessReference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public SessionKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public DeviceCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
