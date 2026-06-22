import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export class CreatePartnerRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public PartnerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public PartnerName!: string;

  @IsEnum(PartnerType)
  public PartnerType!: PartnerType;

  @IsOptional()
  @IsEnum(PartnerStatus)
  public Status?: PartnerStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public SourceSystem!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public ExternalReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public ReferenceText?: string | null;
}
