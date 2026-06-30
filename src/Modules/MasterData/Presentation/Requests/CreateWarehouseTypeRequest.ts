import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateWarehouseTypeRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public WarehouseTypeCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public WarehouseTypeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string | null;

  @IsEnum(MasterDataStatus)
  public Status!: MasterDataStatus;

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
