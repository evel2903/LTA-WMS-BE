import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';

export class UpdatePartnerRequest {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public PartnerCode?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public PartnerName?: string;

  @IsOptional()
  @IsEnum(PartnerStatus)
  public Status?: PartnerStatus;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public SourceSystem?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public ExternalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public ReferenceText?: string | null;
}
