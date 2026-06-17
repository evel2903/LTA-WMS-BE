import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class WarehouseDto {
  public Id!: string;
  public SiteId!: string;
  public WarehouseCode!: string;
  public WarehouseName!: string;
  public WarehouseTypeCode!: string;
  public Status!: MasterDataStatus;
  public Timezone!: string | null;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
