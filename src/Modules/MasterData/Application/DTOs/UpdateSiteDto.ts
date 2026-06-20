import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSiteDto {
  public Id!: string;
  public SiteCode?: string;
  public SiteName?: string;
  public Status?: MasterDataStatus;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ReasonCode?: string | null;
}
