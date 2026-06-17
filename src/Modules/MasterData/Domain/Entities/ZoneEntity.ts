import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ZoneEntity {
  public readonly Id: string;
  public WarehouseId: string;
  public ZoneCode: string;
  public ZoneName: string;
  public ZoneType: string;
  public Status: MasterDataStatus;
  public Sequence: number | null;
  public TemperatureClass: string | null;
  public ComplianceFlags: Record<string, unknown>;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    WarehouseId: string;
    ZoneCode: string;
    ZoneName: string;
    ZoneType: string;
    Status: MasterDataStatus;
    Sequence?: number | null;
    TemperatureClass?: string | null;
    ComplianceFlags?: Record<string, unknown> | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.WarehouseId = params.WarehouseId;
    this.ZoneCode = params.ZoneCode;
    this.ZoneName = params.ZoneName;
    this.ZoneType = params.ZoneType;
    this.Status = params.Status;
    this.Sequence = params.Sequence ?? null;
    this.TemperatureClass = params.TemperatureClass ?? null;
    this.ComplianceFlags = params.ComplianceFlags ?? {};
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
