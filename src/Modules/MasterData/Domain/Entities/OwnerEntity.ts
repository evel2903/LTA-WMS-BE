import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class OwnerEntity {
  public readonly Id: string;
  public OwnerCode: string;
  public OwnerName: string;
  public Status: MasterDataStatus;
  public BillingPolicy: Record<string, unknown>;
  public VisibilityScope: Record<string, unknown>;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    OwnerCode: string;
    OwnerName: string;
    Status: MasterDataStatus;
    BillingPolicy?: Record<string, unknown>;
    VisibilityScope?: Record<string, unknown>;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.OwnerCode = params.OwnerCode;
    this.OwnerName = params.OwnerName;
    this.Status = params.Status;
    this.BillingPolicy = params.BillingPolicy ?? {};
    this.VisibilityScope = params.VisibilityScope ?? {};
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
