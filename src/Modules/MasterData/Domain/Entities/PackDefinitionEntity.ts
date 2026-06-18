import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class PackDefinitionEntity {
  public readonly Id: string;
  public SkuId: string;
  public PackCode: string;
  public PackName: string;
  public UomId: string;
  public QuantityPerPack: number;
  public IsDefault: boolean;
  public Status: MasterDataStatus;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    SkuId: string;
    PackCode: string;
    PackName: string;
    UomId: string;
    QuantityPerPack: number;
    IsDefault?: boolean;
    Status: MasterDataStatus;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SkuId = params.SkuId;
    this.PackCode = params.PackCode;
    this.PackName = params.PackName;
    this.UomId = params.UomId;
    this.QuantityPerPack = params.QuantityPerPack;
    this.IsDefault = params.IsDefault ?? false;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
