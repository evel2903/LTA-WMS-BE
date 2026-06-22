import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export class ListPartnersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public PageSize?: number;

  @IsOptional()
  @IsEnum(PartnerType)
  public PartnerType?: PartnerType;

  @IsOptional()
  @IsEnum(PartnerStatus)
  public Status?: PartnerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public PartnerCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public PartnerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ExternalReference?: string;
}
