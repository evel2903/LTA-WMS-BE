import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ItemCoverageEntity {
  public readonly Id: string;
  public SkuId: string;
  public WarehouseId: string;
  public OwnerId: string | null;
  public MinQty: number | null;
  public MaxQty: number | null;
  public StandardQty: number | null;
  public MultipleQty: number | null;
  public LeadTimeDays: number | null;
  public DefaultReceiveWarehouseId: string | null;
  public DefaultShipWarehouseId: string | null;
  public ReorderPolicy: Record<string, unknown> | null;
  public StopReceiving: boolean;
  public StopShipping: boolean;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    SkuId: string;
    WarehouseId: string;
    OwnerId?: string | null;
    MinQty?: number | null;
    MaxQty?: number | null;
    StandardQty?: number | null;
    MultipleQty?: number | null;
    LeadTimeDays?: number | null;
    DefaultReceiveWarehouseId?: string | null;
    DefaultShipWarehouseId?: string | null;
    ReorderPolicy?: Record<string, unknown> | null;
    StopReceiving?: boolean;
    StopShipping?: boolean;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SkuId = params.SkuId;
    this.WarehouseId = params.WarehouseId;
    this.OwnerId = params.OwnerId ?? null;
    this.MinQty = params.MinQty ?? null;
    this.MaxQty = params.MaxQty ?? null;
    this.StandardQty = params.StandardQty ?? null;
    this.MultipleQty = params.MultipleQty ?? null;
    this.LeadTimeDays = params.LeadTimeDays ?? null;
    this.DefaultReceiveWarehouseId = params.DefaultReceiveWarehouseId ?? null;
    this.DefaultShipWarehouseId = params.DefaultShipWarehouseId ?? null;
    this.ReorderPolicy = params.ReorderPolicy ?? null;
    this.StopReceiving = params.StopReceiving ?? false;
    this.StopShipping = params.StopShipping ?? false;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
