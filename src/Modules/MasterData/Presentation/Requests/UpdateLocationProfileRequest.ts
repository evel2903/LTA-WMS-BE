import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

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
}
