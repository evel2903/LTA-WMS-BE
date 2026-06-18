import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class SkuBarcodeEntity {
  public readonly Id: string;
  public SkuId: string;
  public OwnerId: string | null;
  public UomId: string;
  public PackCode: string | null;
  public BarcodeValue: string;
  public BarcodeType: string;
  public IsPrimary: boolean;
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
    OwnerId?: string | null;
    UomId: string;
    PackCode?: string | null;
    BarcodeValue: string;
    BarcodeType: string;
    IsPrimary?: boolean;
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
    this.OwnerId = params.OwnerId ?? null;
    this.UomId = params.UomId;
    this.PackCode = params.PackCode ?? null;
    this.BarcodeValue = params.BarcodeValue;
    this.BarcodeType = params.BarcodeType;
    this.IsPrimary = params.IsPrimary ?? false;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
