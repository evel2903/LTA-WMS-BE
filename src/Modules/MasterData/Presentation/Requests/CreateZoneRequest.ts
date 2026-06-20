import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateZoneRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public WarehouseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ZoneCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public ZoneName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public ZoneType!: string;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public Sequence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public TemperatureClass?: string;

  @IsOptional()
  @IsObject()
  public ComplianceFlags?: Record<string, unknown>;

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
