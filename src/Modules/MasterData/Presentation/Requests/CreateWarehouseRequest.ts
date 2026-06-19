import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateWarehouseRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public SiteId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public WarehouseCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public WarehouseName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public WarehouseTypeCode!: string;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public Timezone?: string;

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
