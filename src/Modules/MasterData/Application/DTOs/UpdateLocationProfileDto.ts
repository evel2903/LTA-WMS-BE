import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateLocationProfileDto {
  public Id!: string;
  public ProfileCode?: string;
  public ProfileName?: string;
  public LocationType?: string;
  public Version?: number;
  public Status?: MasterDataStatus;
  public CapacityPolicy?: Record<string, unknown> | null;
  public EligibilityPolicy?: Record<string, unknown> | null;
  public MixPolicy?: Record<string, unknown> | null;
  public CompliancePolicy?: Record<string, unknown> | null;
  public OperationPolicy?: Record<string, unknown> | null;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public ReasonCode?: string | null;
}
