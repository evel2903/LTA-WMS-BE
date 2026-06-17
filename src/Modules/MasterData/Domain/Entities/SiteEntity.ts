import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class SiteEntity {
  public readonly Id: string;
  public SiteCode: string;
  public SiteName: string;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    SiteCode: string;
    SiteName: string;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SiteCode = params.SiteCode;
    this.SiteName = params.SiteName;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
