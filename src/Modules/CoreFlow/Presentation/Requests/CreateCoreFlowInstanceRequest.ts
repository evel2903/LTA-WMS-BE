import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCoreFlowInstanceRequest {
  @IsString()
  @MaxLength(100)
  public BusinessReference!: string;

  @IsString()
  @MaxLength(100)
  public SourceSystem!: string;

  @IsString()
  @MaxLength(100)
  public WarehouseCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public CorrelationId?: string;

  @IsOptional()
  @IsObject()
  public Metadata?: Record<string, unknown>;
}
