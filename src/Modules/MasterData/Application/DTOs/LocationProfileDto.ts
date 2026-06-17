import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class LocationProfileDto {
  public Id!: string;
  public ProfileCode!: string;
  public ProfileName!: string;
  public LocationType!: string;
  public Version!: number;
  public Status!: MasterDataStatus;
  public CapacityPolicy!: Record<string, unknown>;
  public EligibilityPolicy!: Record<string, unknown>;
  public MixPolicy!: Record<string, unknown>;
  public CompliancePolicy!: Record<string, unknown>;
  public OperationPolicy!: Record<string, unknown>;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
