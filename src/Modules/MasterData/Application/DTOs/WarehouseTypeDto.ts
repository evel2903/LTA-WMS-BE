import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class WarehouseTypeDto {
  public Id!: string;
  public WarehouseTypeCode!: string;
  public WarehouseTypeName!: string;
  public Description!: string | null;
  public Status!: MasterDataStatus;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
