import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class SiteDto {
  public Id!: string;
  public SiteCode!: string;
  public SiteName!: string;
  public Status!: MasterDataStatus;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
