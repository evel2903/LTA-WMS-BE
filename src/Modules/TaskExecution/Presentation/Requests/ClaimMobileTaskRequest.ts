import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClaimMobileTaskRequest {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  public DeviceCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public SessionId?: string;
}
