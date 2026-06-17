import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateZoneRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ZoneCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public ZoneName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ZoneType?: string;

  @IsOptional()
  @IsEnum(MasterDataStatus)
  public Status?: MasterDataStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public Sequence?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public TemperatureClass?: string | null;

  @IsOptional()
  @IsObject()
  public ComplianceFlags?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;
}
