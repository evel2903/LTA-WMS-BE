import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UomEntity {
  public readonly Id: string;
  public UomCode: string;
  public UomName: string;
  public UomType: string;
  public DecimalPrecision: number;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    UomCode: string;
    UomName: string;
    UomType?: string;
    DecimalPrecision?: number;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.UomCode = params.UomCode;
    this.UomName = params.UomName;
    this.UomType = params.UomType ?? 'Quantity';
    this.DecimalPrecision = params.DecimalPrecision ?? 0;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
