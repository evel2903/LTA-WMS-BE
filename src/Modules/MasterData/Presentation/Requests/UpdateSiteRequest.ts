import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSiteRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public SiteCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public SiteName?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

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
