import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateWarehouseTypeDto {
  public Id!: string;
  public WarehouseTypeName?: string;
  public Description?: string | null;
  public Status?: MasterDataStatus;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ReasonCode?: string | null;
}
