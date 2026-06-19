import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateOwnerRequest {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public OwnerCode?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public OwnerName?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @IsOptional()
  @IsObject()
  public BillingPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public VisibilityScope?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReasonCode?: string;
}
