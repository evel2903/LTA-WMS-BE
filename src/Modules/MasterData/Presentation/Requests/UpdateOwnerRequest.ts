import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateOwnerRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  public OwnerCode?: string;

  @IsOptional()
  @IsString()
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
}
