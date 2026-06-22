import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export class ResolvePartnerByReferenceQuery {
  @IsEnum(PartnerType)
  public PartnerType!: PartnerType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public SourceSystem!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public ExternalReference!: string;
}
