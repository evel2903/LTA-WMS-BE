import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  CapacityPolicy,
  CapacityPolicyFields,
  CompliancePolicy,
  CompliancePolicyFields,
  EligibilityPolicy,
  EligibilityPolicyFields,
  MixPolicy,
  MixPolicyFields,
  OperationPolicy,
  OperationPolicyFields,
} from '@modules/MasterData/Domain/ValueObjects/LocationProfilePolicySchema';
import { IsLocationProfilePolicy } from '@modules/MasterData/Presentation/Validators/IsLocationProfilePolicy';

export class UpdateLocationProfileRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ProfileCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public ProfileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Version?: number;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @IsOptional()
  @IsObject()
  @IsLocationProfilePolicy(CapacityPolicyFields)
  public CapacityPolicy?: CapacityPolicy;

  @IsOptional()
  @IsObject()
  @IsLocationProfilePolicy(EligibilityPolicyFields)
  public EligibilityPolicy?: EligibilityPolicy;

  @IsOptional()
  @IsObject()
  @IsLocationProfilePolicy(MixPolicyFields)
  public MixPolicy?: MixPolicy;

  @IsOptional()
  @IsObject()
  @IsLocationProfilePolicy(CompliancePolicyFields)
  public CompliancePolicy?: CompliancePolicy;

  @IsOptional()
  @IsObject()
  @IsLocationProfilePolicy(OperationPolicyFields)
  public OperationPolicy?: OperationPolicy;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReasonCode?: string;
}
