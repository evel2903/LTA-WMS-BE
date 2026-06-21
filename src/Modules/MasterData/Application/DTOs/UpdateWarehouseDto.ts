import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateWarehouseDto {
  public Id!: string;
  public SiteId?: string;
  public WarehouseCode?: string;
  public WarehouseName?: string;
  public WarehouseTypeCode?: string;
  public Status?: MasterDataStatus;
  public Timezone?: string | null;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ActorUserId?: string;
  public ReasonCode?: string | null;
}
