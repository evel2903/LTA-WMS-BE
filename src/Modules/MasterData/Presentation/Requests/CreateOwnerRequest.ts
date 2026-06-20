import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateOwnerRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public OwnerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public OwnerName!: string;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

  @IsOptional()
  @IsObject()
  public BillingPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public VisibilityScope?: Record<string, unknown>;

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
