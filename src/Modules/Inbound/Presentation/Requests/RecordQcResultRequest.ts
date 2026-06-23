import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';

export class RecordQcResultRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  public IdempotencyKey!: string;

  @IsEnum(QcResultStatus)
  public ResultStatus!: QcResultStatus;

  @IsEnum(QcDispositionCode)
  public DispositionCode!: QcDispositionCode;

  @IsNumber()
  @Min(0.0001)
  public InspectedQuantity!: number;

  @IsNumber()
  @Min(0)
  public AcceptedQuantity!: number;

  @IsNumber()
  @Min(0)
  public RejectedQuantity!: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  public ReasonCode?: string | null;

  @IsString()
  @IsOptional()
  public ReasonNote?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public EvidenceRefs?: string[];

  @IsObject()
  @IsOptional()
  public EvidenceJson?: Record<string, unknown> | null;
}
