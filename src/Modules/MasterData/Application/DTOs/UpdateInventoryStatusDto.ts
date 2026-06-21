import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateInventoryStatusDto {
  public Id!: string;
  public DisplayName?: string;
  public StageGroup?: string;
  public AllowsAllocation?: boolean;
  public AllowsPick?: boolean;
  public Hold?: boolean;
  public IsTerminal?: boolean;
  public IsMilestone?: boolean;
  public SortOrder?: number;
  public Status?: MasterDataStatus;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ReasonCode?: string | null;
}
