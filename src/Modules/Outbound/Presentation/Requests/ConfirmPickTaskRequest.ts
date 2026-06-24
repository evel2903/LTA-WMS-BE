import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmPickTaskRequest {
  @IsOptional()
  @IsString()
  public MobileTaskId?: string | null;

  @IsOptional()
  @IsString()
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];

  @IsOptional()
  @IsString()
  public DeviceCode?: string | null;

  @IsOptional()
  @IsString()
  public SessionId?: string | null;

  @IsString()
  @IsNotEmpty()
  public IdempotencyKey!: string;
}
