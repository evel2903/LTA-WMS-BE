import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class InventoryStatusEntity {
  public readonly Id: string;
  public StatusCode: string;
  public DisplayName: string;
  public StageGroup: string;
  public AllowsAllocation: boolean;
  public AllowsPick: boolean;
  public IsTerminal: boolean;
  public IsMilestone: boolean;
  public SortOrder: number;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    StatusCode: string;
    DisplayName: string;
    StageGroup: string;
    AllowsAllocation?: boolean;
    AllowsPick?: boolean;
    IsTerminal?: boolean;
    IsMilestone?: boolean;
    SortOrder: number;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.StatusCode = params.StatusCode;
    this.DisplayName = params.DisplayName;
    this.StageGroup = params.StageGroup;
    this.AllowsAllocation = params.AllowsAllocation ?? false;
    this.AllowsPick = params.AllowsPick ?? false;
    this.IsTerminal = params.IsTerminal ?? false;
    this.IsMilestone = params.IsMilestone ?? false;
    this.SortOrder = params.SortOrder;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
