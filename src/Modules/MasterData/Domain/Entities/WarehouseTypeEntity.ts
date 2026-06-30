import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class WarehouseTypeEntity {
  public readonly Id: string;
  public WarehouseTypeCode: string;
  public WarehouseTypeName: string;
  public Description: string | null;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    WarehouseTypeCode: string;
    WarehouseTypeName: string;
    Description?: string | null;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.WarehouseTypeCode = params.WarehouseTypeCode;
    this.WarehouseTypeName = params.WarehouseTypeName;
    this.Description = params.Description ?? null;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
