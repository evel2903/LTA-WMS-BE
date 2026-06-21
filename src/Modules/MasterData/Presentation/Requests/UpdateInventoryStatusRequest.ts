import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateInventoryStatusRequest {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  public DisplayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public StageGroup?: string;

  @IsOptional()
  @IsBoolean()
  public AllowsAllocation?: boolean;

  @IsOptional()
  @IsBoolean()
  public AllowsPick?: boolean;

  @IsOptional()
  @IsBoolean()
  public Hold?: boolean;

  @IsOptional()
  @IsBoolean()
  public IsTerminal?: boolean;

  @IsOptional()
  @IsBoolean()
  public IsMilestone?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public SortOrder?: number;

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
