import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export interface ResolvePartnerByReferenceDto {
  PartnerType: PartnerType;
  SourceSystem: string;
  ExternalReference: string;
}
