import { Type } from 'class-transformer';
import { IsDate, IsDefined, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class IntegrationEnvelopeRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public MessageId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public MessageType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  public Version!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BusinessReference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public SourceSystem!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public TargetSystem!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public WarehouseContext!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerContext?: string | null;

  @Type(() => Date)
  @IsDate()
  public EventTime!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public CorrelationId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public CausationId?: string | null;

  @IsDefined()
  @IsObject()
  public Payload!: Record<string, unknown>;
}
