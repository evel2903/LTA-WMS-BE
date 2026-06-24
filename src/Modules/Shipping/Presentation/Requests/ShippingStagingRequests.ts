import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';

export class ListShippingStagingQuery {
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
  @IsEnum(ShipmentPackageStagingStatus)
  public Status?: ShipmentPackageStagingStatus;

  @IsOptional()
  @IsString()
  public PackageId?: string;

  @IsOptional()
  @IsString()
  public OutboundOrderId?: string;

  @IsOptional()
  @IsString()
  public ShipmentReference?: string;
}

export class StagePackageRequest {
  @IsString()
  public PackageId!: string;

  @IsOptional()
  @IsString()
  public ShipmentReference?: string;

  @IsString()
  public StagingLaneCode!: string;

  @IsOptional()
  @IsString()
  public StagingLocationId?: string;

  @IsOptional()
  @IsString()
  public StagingLocationCode?: string;

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

export class AssignDockRequest {
  @IsOptional()
  @IsString()
  public DockDoorId?: string;

  @IsOptional()
  @IsString()
  public DockDoorCode?: string;

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

export class AssignTruckRequest {
  @IsOptional()
  @IsString()
  public TruckReference?: string;

  @IsOptional()
  @IsString()
  public VehicleNumber?: string;

  @IsOptional()
  @IsString()
  public DriverName?: string;

  @IsOptional()
  @IsString()
  public CarrierId?: string;

  @IsOptional()
  @IsString()
  public CarrierCode?: string;

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

export class ScanLoadingRequest {
  @IsOptional()
  @IsString()
  public ScannedPackageId?: string;

  @IsOptional()
  @IsString()
  public ScannedPackageCode?: string;

  @IsOptional()
  @IsString()
  public ShipmentReference?: string;

  @IsOptional()
  @IsString()
  public LoadReference?: string;

  @IsOptional()
  @IsString()
  public TruckReference?: string;

  @IsOptional()
  @IsString()
  public VehicleNumber?: string;

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

export class ConfirmShipmentRequest {
  @IsOptional()
  @IsString()
  public ShipmentReference?: string;

  @IsOptional()
  @IsBoolean()
  public RequireFullLoad?: boolean;

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

export class RecordGateOutRequest {
  @IsOptional()
  @IsString()
  public GateOutReference?: string;

  @IsOptional()
  @IsString()
  public TruckReference?: string;

  @IsOptional()
  @IsString()
  public VehicleNumber?: string;

  @IsOptional()
  @IsString()
  public InventoryStatusCode?: string;

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

export class EvaluateGoodsIssueTriggerRequest {
  @IsOptional()
  @IsIn(['at_loading', 'at_gate_out'])
  public GoodsIssueTrigger?: 'at_loading' | 'at_gate_out';

  @IsOptional()
  @IsString()
  public InventoryStatusCode?: string;

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

export class PostGoodsIssueRequest {
  @IsOptional()
  @IsString()
  public InventoryStatusCode?: string;

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
