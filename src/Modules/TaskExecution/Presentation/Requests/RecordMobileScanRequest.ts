import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';

export class RecordMobileScanRequest {
  @IsEnum(MobileScanType)
  public ScanType!: MobileScanType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  public RawValue!: string;

  @IsOptional()
  @IsBoolean()
  public ManualEntry?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public DeviceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public SessionId?: string | null;
}
