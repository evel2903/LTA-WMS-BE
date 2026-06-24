import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';

export class ShipmentPackageStagingEntity {
  public readonly Id: string;
  public StagingCode: string;
  public PackageId: string;
  public PackageCode: string;
  public OutboundOrderId: string;
  public WarehouseProfileId: string;
  public WarehouseId: string | null;
  public WarehouseCode: string | null;
  public OwnerId: string | null;
  public OwnerCode: string | null;
  public Status: ShipmentPackageStagingStatus;
  public InventoryStatusCode: string | null;
  public ShipmentReference: string | null;
  public StagingLaneCode: string;
  public StagingLocationId: string | null;
  public StagingLocationCode: string | null;
  public DockDoorId: string | null;
  public DockDoorCode: string | null;
  public TruckReference: string | null;
  public VehicleNumber: string | null;
  public DriverName: string | null;
  public CarrierId: string | null;
  public CarrierCode: string | null;
  public CoreFlowInstanceId: string | null;
  public StageIdempotencyKey: string;
  public StagePayloadFingerprint: string;
  public DockIdempotencyKey: string | null;
  public DockPayloadFingerprint: string | null;
  public TruckIdempotencyKey: string | null;
  public TruckPayloadFingerprint: string | null;
  public LoadingIdempotencyKey: string | null;
  public LoadingPayloadFingerprint: string | null;
  public ShipmentConfirmIdempotencyKey: string | null;
  public ShipmentConfirmPayloadFingerprint: string | null;
  public ReasonCode: string | null;
  public ReasonCodeId: string | null;
  public ReasonNote: string | null;
  public EvidenceRefs: string[];
  public StagedAt: Date;
  public StagedBy: string | null;
  public DockAssignedAt: Date | null;
  public DockAssignedBy: string | null;
  public TruckAssignedAt: Date | null;
  public TruckAssignedBy: string | null;
  public LoadReference: string | null;
  public LoadedAt: Date | null;
  public LoadedBy: string | null;
  public ShipmentConfirmedAt: Date | null;
  public ShipmentConfirmedBy: string | null;
  public LoadingOutboxMessageId: string | null;
  public ShipmentConfirmOutboxMessageId: string | null;
  public CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    StagingCode: string;
    PackageId: string;
    PackageCode: string;
    OutboundOrderId: string;
    WarehouseProfileId: string;
    WarehouseId?: string | null;
    WarehouseCode?: string | null;
    OwnerId?: string | null;
    OwnerCode?: string | null;
    Status: ShipmentPackageStagingStatus;
    InventoryStatusCode?: string | null;
    ShipmentReference?: string | null;
    StagingLaneCode: string;
    StagingLocationId?: string | null;
    StagingLocationCode?: string | null;
    DockDoorId?: string | null;
    DockDoorCode?: string | null;
    TruckReference?: string | null;
    VehicleNumber?: string | null;
    DriverName?: string | null;
    CarrierId?: string | null;
    CarrierCode?: string | null;
    CoreFlowInstanceId?: string | null;
    StageIdempotencyKey: string;
    StagePayloadFingerprint: string;
    DockIdempotencyKey?: string | null;
    DockPayloadFingerprint?: string | null;
    TruckIdempotencyKey?: string | null;
    TruckPayloadFingerprint?: string | null;
    LoadingIdempotencyKey?: string | null;
    LoadingPayloadFingerprint?: string | null;
    ShipmentConfirmIdempotencyKey?: string | null;
    ShipmentConfirmPayloadFingerprint?: string | null;
    ReasonCode?: string | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: string[];
    StagedAt: Date;
    StagedBy?: string | null;
    DockAssignedAt?: Date | null;
    DockAssignedBy?: string | null;
    TruckAssignedAt?: Date | null;
    TruckAssignedBy?: string | null;
    LoadReference?: string | null;
    LoadedAt?: Date | null;
    LoadedBy?: string | null;
    ShipmentConfirmedAt?: Date | null;
    ShipmentConfirmedBy?: string | null;
    LoadingOutboxMessageId?: string | null;
    ShipmentConfirmOutboxMessageId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.StagingCode = params.StagingCode;
    this.PackageId = params.PackageId;
    this.PackageCode = params.PackageCode;
    this.OutboundOrderId = params.OutboundOrderId;
    this.WarehouseProfileId = params.WarehouseProfileId;
    this.WarehouseId = params.WarehouseId ?? null;
    this.WarehouseCode = params.WarehouseCode ?? null;
    this.OwnerId = params.OwnerId ?? null;
    this.OwnerCode = params.OwnerCode ?? null;
    this.Status = params.Status;
    this.InventoryStatusCode = params.InventoryStatusCode ?? null;
    this.ShipmentReference = params.ShipmentReference ?? null;
    this.StagingLaneCode = params.StagingLaneCode;
    this.StagingLocationId = params.StagingLocationId ?? null;
    this.StagingLocationCode = params.StagingLocationCode ?? null;
    this.DockDoorId = params.DockDoorId ?? null;
    this.DockDoorCode = params.DockDoorCode ?? null;
    this.TruckReference = params.TruckReference ?? null;
    this.VehicleNumber = params.VehicleNumber ?? null;
    this.DriverName = params.DriverName ?? null;
    this.CarrierId = params.CarrierId ?? null;
    this.CarrierCode = params.CarrierCode ?? null;
    this.CoreFlowInstanceId = params.CoreFlowInstanceId ?? null;
    this.StageIdempotencyKey = params.StageIdempotencyKey;
    this.StagePayloadFingerprint = params.StagePayloadFingerprint;
    this.DockIdempotencyKey = params.DockIdempotencyKey ?? null;
    this.DockPayloadFingerprint = params.DockPayloadFingerprint ?? null;
    this.TruckIdempotencyKey = params.TruckIdempotencyKey ?? null;
    this.TruckPayloadFingerprint = params.TruckPayloadFingerprint ?? null;
    this.LoadingIdempotencyKey = params.LoadingIdempotencyKey ?? null;
    this.LoadingPayloadFingerprint = params.LoadingPayloadFingerprint ?? null;
    this.ShipmentConfirmIdempotencyKey = params.ShipmentConfirmIdempotencyKey ?? null;
    this.ShipmentConfirmPayloadFingerprint = params.ShipmentConfirmPayloadFingerprint ?? null;
    this.ReasonCode = params.ReasonCode ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.StagedAt = params.StagedAt;
    this.StagedBy = params.StagedBy ?? null;
    this.DockAssignedAt = params.DockAssignedAt ?? null;
    this.DockAssignedBy = params.DockAssignedBy ?? null;
    this.TruckAssignedAt = params.TruckAssignedAt ?? null;
    this.TruckAssignedBy = params.TruckAssignedBy ?? null;
    this.LoadReference = params.LoadReference ?? null;
    this.LoadedAt = params.LoadedAt ?? null;
    this.LoadedBy = params.LoadedBy ?? null;
    this.ShipmentConfirmedAt = params.ShipmentConfirmedAt ?? null;
    this.ShipmentConfirmedBy = params.ShipmentConfirmedBy ?? null;
    this.LoadingOutboxMessageId = params.LoadingOutboxMessageId ?? null;
    this.ShipmentConfirmOutboxMessageId = params.ShipmentConfirmOutboxMessageId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public RefreshStatus(): void {
    if (
      this.Status === ShipmentPackageStagingStatus.Loaded ||
      this.Status === ShipmentPackageStagingStatus.ShipmentConfirmed
    ) {
      return;
    }
    if (this.DockDoorId || this.DockDoorCode) {
      this.Status = ShipmentPackageStagingStatus.DockAssigned;
    }
    if (this.TruckReference || this.VehicleNumber) {
      this.Status = ShipmentPackageStagingStatus.TruckAssigned;
    }
    if ((this.DockDoorId || this.DockDoorCode) && (this.TruckReference || this.VehicleNumber)) {
      this.Status = ShipmentPackageStagingStatus.ReadyForLoading;
    }
  }
}
