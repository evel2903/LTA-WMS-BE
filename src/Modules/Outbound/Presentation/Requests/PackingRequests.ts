import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';

export class ListPackagesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public PageSize?: number;

  @IsOptional()
  @IsString()
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsEnum(PackageStatus)
  public Status?: PackageStatus;

  @IsOptional()
  @IsString()
  public PickTaskId?: string;

  @IsOptional()
  @IsString()
  public OutboundOrderId?: string;
}

export class StartPackSessionRequest {
  @IsString()
  public PickTaskId!: string;

  @IsOptional()
  @IsString()
  public MobileTaskId?: string;

  @IsString()
  public WarehouseProfileId!: string;

  @IsOptional()
  @IsBoolean()
  public CheckRequired?: boolean;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  public IdempotencyKey!: string;
}

export class RecordPackCheckRequest {
  @IsEnum(PackageCheckResult)
  public CheckResult!: PackageCheckResult;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public ObservedQuantity?: number;

  @IsOptional()
  @IsString()
  public ObservedSkuId?: string;

  @IsOptional()
  @IsString()
  public ObservedSkuCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Weight?: number;

  @IsString()
  public IdempotencyKey!: string;
}

export class CreatePackageContentRequest {
  @IsOptional()
  @IsString()
  public PickTaskId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Quantity?: number;
}

export class CreatePackageRequest {
  @IsString()
  public PackSessionId!: string;

  @IsString()
  public CartonType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Height?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageContentRequest)
  public Contents?: CreatePackageContentRequest[];

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  public IdempotencyKey!: string;
}

export class ClosePackageRequest {
  @IsOptional()
  @IsString()
  public CartonType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  public Height?: number;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsString()
  public IdempotencyKey!: string;
}

export class ReadyForStagingRequest {
  @IsOptional()
  @IsBoolean()
  public AttemptOverride?: boolean;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsOptional()
  @IsString()
  public LabelType?: string;

  @IsString()
  public IdempotencyKey!: string;
}
