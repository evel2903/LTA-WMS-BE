import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateWarehouseDto {
  public SiteId!: string;
  public WarehouseCode!: string;
  public WarehouseName!: string;
  public WarehouseTypeCode!: string;
  public Status!: MasterDataStatus;
  public Timezone?: string;
  public SourceSystem?: string;
  public ReferenceId?: string;
  public ReasonCode?: string | null;
}
