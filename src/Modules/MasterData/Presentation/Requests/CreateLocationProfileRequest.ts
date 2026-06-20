import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateLocationProfileRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ProfileCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public ProfileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public LocationType!: string;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

  @IsOptional()
  @IsObject()
  public CapacityPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public EligibilityPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public MixPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public CompliancePolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public OperationPolicy?: Record<string, unknown>;

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
