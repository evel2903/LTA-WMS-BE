import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class WarehouseEntity {
  public readonly Id: string;
  public SiteId: string;
  public WarehouseCode: string;
  public WarehouseName: string;
  public WarehouseTypeCode: string;
  public Status: MasterDataStatus;
  public Timezone: string | null;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    SiteId: string;
    WarehouseCode: string;
    WarehouseName: string;
    WarehouseTypeCode: string;
    Status: MasterDataStatus;
    Timezone?: string | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SiteId = params.SiteId;
    this.WarehouseCode = params.WarehouseCode;
    this.WarehouseName = params.WarehouseName;
    this.WarehouseTypeCode = params.WarehouseTypeCode;
    this.Status = params.Status;
    this.Timezone = params.Timezone ?? null;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
