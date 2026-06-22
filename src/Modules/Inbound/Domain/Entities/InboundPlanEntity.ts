import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

export class InboundPlanEntity {
  public readonly Id: string;
  public SourceSystem: string;
  public SourceDocumentType: string;
  public SourceDocumentNumber: string;
  public BusinessReference: string;
  public SupplierId: string;
  public SupplierCode: string | null;
  public OwnerId: string;
  public OwnerCode: string | null;
  public WarehouseId: string;
  public WarehouseCode: string | null;
  public WarehouseProfileId: string | null;
  public ExpectedArrivalAt: Date | null;
  public Status: InboundPlanDocumentStatus;
  public GateInStatus: InboundGateInStatus;
  public GateInAt: Date | null;
  public GateReference: string | null;
  public VehicleNumber: string | null;
  public DriverName: string | null;
  public EvidenceRefs: string[];
  public CoreFlowInstanceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    SourceSystem: string;
    SourceDocumentType: string;
    SourceDocumentNumber: string;
    BusinessReference: string;
    SupplierId: string;
    SupplierCode?: string | null;
    OwnerId: string;
    OwnerCode?: string | null;
    WarehouseId: string;
    WarehouseCode?: string | null;
    WarehouseProfileId?: string | null;
    ExpectedArrivalAt?: Date | null;
    Status?: InboundPlanDocumentStatus;
    GateInStatus?: InboundGateInStatus;
    GateInAt?: Date | null;
    GateReference?: string | null;
    VehicleNumber?: string | null;
    DriverName?: string | null;
    EvidenceRefs?: string[];
    CoreFlowInstanceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SourceSystem = params.SourceSystem;
    this.SourceDocumentType = params.SourceDocumentType;
    this.SourceDocumentNumber = params.SourceDocumentNumber;
    this.BusinessReference = params.BusinessReference;
    this.SupplierId = params.SupplierId;
    this.SupplierCode = params.SupplierCode ?? null;
    this.OwnerId = params.OwnerId;
    this.OwnerCode = params.OwnerCode ?? null;
    this.WarehouseId = params.WarehouseId;
    this.WarehouseCode = params.WarehouseCode ?? null;
    this.WarehouseProfileId = params.WarehouseProfileId ?? null;
    this.ExpectedArrivalAt = params.ExpectedArrivalAt ?? null;
    this.Status = params.Status ?? InboundPlanDocumentStatus.Planned;
    this.GateInStatus = params.GateInStatus ?? InboundGateInStatus.NotRecorded;
    this.GateInAt = params.GateInAt ?? null;
    this.GateReference = params.GateReference ?? null;
    this.VehicleNumber = params.VehicleNumber ?? null;
    this.DriverName = params.DriverName ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.CoreFlowInstanceId = params.CoreFlowInstanceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public RecordGateIn(params: {
    GateInAt: Date;
    GateReference: string;
    VehicleNumber?: string | null;
    DriverName?: string | null;
    EvidenceRefs?: string[];
    UpdatedBy?: string | null;
  }): void {
    this.GateInStatus = InboundGateInStatus.Recorded;
    this.GateInAt = params.GateInAt;
    this.GateReference = params.GateReference;
    this.VehicleNumber = params.VehicleNumber ?? null;
    this.DriverName = params.DriverName ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.UpdatedAt = new Date();
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public RecordGateInOverride(params: { EvidenceRefs?: string[]; UpdatedBy?: string | null }): void {
    this.GateInStatus = InboundGateInStatus.OverrideAccepted;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.UpdatedAt = new Date();
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
