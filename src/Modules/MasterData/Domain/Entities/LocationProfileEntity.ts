import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  CapacityPolicy,
  CompliancePolicy,
  EligibilityPolicy,
  MixPolicy,
  OperationPolicy,
} from '@modules/MasterData/Domain/ValueObjects/LocationProfilePolicySchema';

export class LocationProfileEntity {
  public readonly Id: string;
  public ProfileCode: string;
  public ProfileName: string;
  public LocationType: string;
  public Version: number;
  public Status: MasterDataStatus;
  public CapacityPolicy: CapacityPolicy;
  public EligibilityPolicy: EligibilityPolicy;
  public MixPolicy: MixPolicy;
  public CompliancePolicy: CompliancePolicy;
  public OperationPolicy: OperationPolicy;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    ProfileCode: string;
    ProfileName: string;
    LocationType: string;
    Version?: number;
    Status: MasterDataStatus;
    CapacityPolicy?: CapacityPolicy | null;
    EligibilityPolicy?: EligibilityPolicy | null;
    MixPolicy?: MixPolicy | null;
    CompliancePolicy?: CompliancePolicy | null;
    OperationPolicy?: OperationPolicy | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ProfileCode = params.ProfileCode;
    this.ProfileName = params.ProfileName;
    this.LocationType = params.LocationType;
    this.Version = params.Version ?? 1;
    this.Status = params.Status;
    this.CapacityPolicy = params.CapacityPolicy ?? {};
    this.EligibilityPolicy = params.EligibilityPolicy ?? {};
    this.MixPolicy = params.MixPolicy ?? {};
    this.CompliancePolicy = params.CompliancePolicy ?? {};
    this.OperationPolicy = params.OperationPolicy ?? {};
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
