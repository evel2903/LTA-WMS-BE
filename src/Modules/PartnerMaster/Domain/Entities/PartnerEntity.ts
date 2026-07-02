import { PartnerRiskLevel } from '@modules/PartnerMaster/Domain/Enums/PartnerRiskLevel';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export class PartnerEntity {
  public readonly Id: string;
  public PartnerCode: string;
  public PartnerName: string;
  public PartnerType: PartnerType;
  public Status: PartnerStatus;
  public SourceSystem: string;
  public ExternalReference: string;
  public ReferenceText: string | null;
  public RiskLevel: PartnerRiskLevel | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    PartnerCode: string;
    PartnerName: string;
    PartnerType: PartnerType;
    Status: PartnerStatus;
    SourceSystem: string;
    ExternalReference: string;
    ReferenceText?: string | null;
    RiskLevel?: PartnerRiskLevel | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.PartnerCode = params.PartnerCode;
    this.PartnerName = params.PartnerName;
    this.PartnerType = params.PartnerType;
    this.Status = params.Status;
    this.SourceSystem = params.SourceSystem;
    this.ExternalReference = params.ExternalReference;
    this.ReferenceText = params.ReferenceText ?? null;
    this.RiskLevel = params.RiskLevel ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
