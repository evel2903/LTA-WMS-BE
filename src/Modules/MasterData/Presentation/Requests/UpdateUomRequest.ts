import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateUomRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  public UomCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public UomName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public UomType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  public DecimalPrecision?: number;

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
}
