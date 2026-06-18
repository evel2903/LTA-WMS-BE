import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UomConversionEntity {
  public readonly Id: string;
  public SkuId: string;
  public FromUomId: string;
  public ToUomId: string;
  public Factor: number;
  public EffectiveFrom: Date;
  public EffectiveTo: Date | null;
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
    FromUomId: string;
    ToUomId: string;
    Factor: number;
    EffectiveFrom: Date;
    EffectiveTo?: Date | null;
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
    this.FromUomId = params.FromUomId;
    this.ToUomId = params.ToUomId;
    this.Factor = params.Factor;
    this.EffectiveFrom = params.EffectiveFrom;
    this.EffectiveTo = params.EffectiveTo ?? null;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
