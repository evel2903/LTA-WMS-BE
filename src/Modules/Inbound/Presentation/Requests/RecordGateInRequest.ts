import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class RecordGateInRequest {
  @IsDateString()
  public GateInAt!: string;

  @IsString()
  public GateReference!: string;

  @IsOptional()
  @IsString()
  public VehicleNumber?: string;

  @IsOptional()
  @IsString()
  public DriverName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];
}
