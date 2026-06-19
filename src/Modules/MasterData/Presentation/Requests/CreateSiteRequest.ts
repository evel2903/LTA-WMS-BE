import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateSiteRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public SiteCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public SiteName!: string;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

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
