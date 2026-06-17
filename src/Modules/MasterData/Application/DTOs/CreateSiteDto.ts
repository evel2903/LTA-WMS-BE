import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateSiteDto {
  public SiteCode!: string;
  public SiteName!: string;
  public Status!: MasterDataStatus;
  public SourceSystem?: string;
  public ReferenceId?: string;
}
